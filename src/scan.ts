import * as wikipedia from './wikipedia';
import {URL} from 'url';
import { Pool } from './pool';

interface LinkScanResult {
    found: boolean,
    path: string[],
    jumps?: number,
    //if we haven't found the right page, these are the links found on the current one to check
    links: string[]
}

class WikipediaScanner {
    private checkedTitles: Set<string>;
    private maxPageChain: number;
    private stats: {
        scanDuration: number,
        apiCalls: number,
        checkedTitles: number,
        retriedCalls: number
    };
    private found: boolean;
    private logNum: number;

    constructor(private startTitle: string, private endTitle: string, private progressLogFn: Function) {
        this.checkedTitles = new Set();
        this.maxPageChain = 10;
        this.found = false;
        this.logNum = 0;

        //keep some statistics about the search
        this.stats = {
            scanDuration: 0,
            apiCalls: 0,
            checkedTitles: 0,
            retriedCalls: 0
        }
    }
    async start() {
        //if the title is the same, don't even look for links, can't possibly find something shorter than zero clicks away
        if (this.startTitle === this.endTitle) {
            return {
                from: this.startTitle,
                to: this.endTitle,
                path: [this.startTitle],
                jumps: 0,
                stats: this.stats
            }
        }
        const startTime = Date.now();
        const foundPath = await this.scan(0, [{
            found: false,
            links: [this.startTitle],
            path: [],
        }])

        this.stats.scanDuration = Date.now() - startTime;
        return {
            from: this.startTitle,
            to: this.endTitle,
            path: foundPath.path,
            jumps: foundPath.jumps,
            stats: this.stats
        }
    }
    checkTitle(title: string) {
        this.stats.checkedTitles++;
        this.checkedTitles.add(title);
        if (title === this.endTitle) {
            return true;
        }
    }
    async scan(level: number, chains: LinkScanResult[]): Promise<LinkScanResult> {
        console.log(` -- scanning -- level ${level}, scanning ${chains.length} chains`)

        const nextChains: LinkScanResult[] = [];

        const pool = new Pool(20);

        //do a breadth first search on the links we know of from the last level, if we don't find it
        //next time check all the links from all of the pages we're looking at now
        for (let i = 0; i < chains.length; i++) {
            const { links, path } = chains[i];
            for (let j = 0; j < links.length; j++) {
                const queue = () => {
                    pool.queue(async () => {
                        const blankResponse = {
                            found: false,
                            path: [],
                            links: []
                        };
                        //already found, stop looking before requesting
                        if (this.found) {
                            return blankResponse;
                        }
                        try {
                            const checkResults = await this.checkPage(links[j], path);
                            //found while requesting, stop analysis
                            if (this.found) {
                                return;
                            }

                            if (checkResults.found) {
                                this.found = true;
                            }
                            nextChains.push(checkResults);
                            return checkResults;
                        } catch (e) {
                            //if we got a Too Many Requests http status code, queue it again
                            if (e === 429) {
                                this.stats.retriedCalls++;
                                console.log(`Retrying ${links[j]}`);
                                queue();
                                return blankResponse;
                            }
                            else {
                                console.log(`error returned from ${links[j]} - ${e}`)
                            }
                        }
                    })
                }
                queue();
            }
        }

        //if we've found a link, just return that
        const scans: LinkScanResult[] = await pool.done(),
            found = scans.find(result => {return result && result.found});

        //otherwise keep scanning the next level
        return found ||  await this.scan(++level, nextChains);
    }
    /**
     * 
     * @param title - A wikipedia page title
     * @param pageChain - An array of page titles that it took to get here
     */
    async checkPage(title: string, pageChain: Array<string>): Promise<LinkScanResult> {
        //don't want to get too out of hand, each level can be exponentially more pages.
        if (pageChain.length > this.maxPageChain) {
            throw new Error(`Couldn't find ${this.endTitle} in ${this.maxPageChain} links`);
        }
        //filter down to every link that hasn't been checked yet
        const links = (await wikipedia.getLinkedTitles(title))
            .filter(link => !this.checkedTitles.has(link));

        this.stats.apiCalls++;

        //if we can, see if the page we're looking for is linked on the current page
        const found = links.reduce((foundLink: any,link: string) => {
            if (foundLink) {
                return foundLink;
            }

            const pathToThis = [...pageChain, title, link],
                prettyPathToThis = pathToThis.join(' → ');

            this.logInfrequently(prettyPathToThis)

            if (this.checkTitle(link)) {
                return {
                    found: true,
                    path: pathToThis,
                    //subtract one because the start isn't considered a jump and it's included in the path
                    jumps: pathToThis.length - 1,
                    links: []
                }
            }
        }, null);

        //if we've found a link send it all the way up
        if (found) {
            return found;
        }
        //if we haven't found it, we need to search through 'links' when we go down another level
        return {
            found: false,
            links,
            path: [...pageChain, title],
        };
    }

    /**
     * Every so often this will log something in the UI. Since so many titles are being checked, it doesn't really matter that
     * if we dont' show every title, but just a title every so often so you can see that it's still searching.
     * @param str a string to show as "progress" in the UI.
     */
    logInfrequently(str: string) {
        if (this.logNum++ % 1000 === 0) {
            this.progressLogFn(str);
        }
    }
}

export const scan = async (startTitle: string, endTitle: string, progressLogFn: Function) => {
    /**
     * If a wikipedia page URL was entered, parse the title out of it
     * @param titleOrUrl - wikipedia page title or a URL to a wikipedia page
     */
    const parseTitle = (titleOrUrl: string) => {
        if (!titleOrUrl.includes('wikipedia.org/wiki')) {
            return titleOrUrl; //just a title
        }
        const u = new URL(titleOrUrl)
        return u.pathname.replace('/wiki/', '');
    }

    /**
     * If a link was entered, we need to get the page title without any character encoding, because "Kevin_Bacon" !== "Kevin Bacon"
     * and we'd otherwise never find the right page.
     */
    const normalized = (title: string) => {
        return wikipedia.getNormalizedTitle(title);
    }

    return await new WikipediaScanner(
        await normalized(parseTitle(startTitle)),
        await normalized(parseTitle(endTitle)),
        progressLogFn)
        .start();
};