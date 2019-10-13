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
    private startTime: number;
    private found: boolean;
    private logNum: number;

    constructor(private startTitle: string, private endTitle: string, private progressLogFn: Function) {
        this.checkedTitles = new Set();
        this.maxPageChain = 10;
        this.startTime = 0;
        this.found = false;
        this.logNum = 0;

        this.stats = {
            scanDuration: 0,
            apiCalls: 0,
            checkedTitles: 0,
            retriedCalls: 0
        }
    }
    async start() {
        if (this.startTitle === this.endTitle) {
            return {
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
    async checkPage(title: string, pageChain: Array<string>): Promise<LinkScanResult> {
        if (pageChain.length > this.maxPageChain) {
            throw new Error(`Couldn't find ${this.endTitle} in ${this.maxPageChain} links`);
        }
        //filter down to every link that hasn't been checked yet
        const links = (await wikipedia.getLinkedTitles(title))
            .filter(link => !this.checkedTitles.has(link));

        this.stats.apiCalls++;
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

        //if we've found a link
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

    logInfrequently(str: string) {
        if (this.logNum++ % 1000 === 0) {
            this.progressLogFn(str);
        }
    }
}

export const scan = async (startTitle: string, endTitle: string, progressLogFn: Function) => {
    /**
     * If a wikipedia page URL was entered, parse the title out of ti
     * @param titleOrUrl - wikipedia page title or a URL to a wikipedia page
     */
    const parseTitle = (titleOrUrl: string) => {
        if (!titleOrUrl.includes('wikipedia.org/wiki')) {
            return titleOrUrl; //just a title
        }
        const u = new URL(titleOrUrl)
        return u.pathname.replace('/wiki/', '');
    }
    return await new WikipediaScanner(parseTitle(startTitle), parseTitle(endTitle), progressLogFn).start();
};