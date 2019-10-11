import * as wikipedia from './wikipedia';
import { Pool } from './pool';

interface LinkScanResult {
    found: boolean,
    links: string[],
    path: string[]
}

let logNum = 0;
function logInfrequently(str: string) {
    if (logNum++ % 1000 === 0) {
        console.log(str);
    }
}

class WikipediaScanner {
    private checkedTitles: Set<string>;
    private maxPageChain: number;
    private stats: { apiCalls: number, checkedTitles: number, retriedCalls: number};
    private startTime: number;
    private found: boolean;

    constructor(private startTitle: string, private endTitle: string) {
        this.checkedTitles = new Set();
        this.maxPageChain = 10;
        this.startTime = 0;
        this.found = false;

        this.stats = {
            apiCalls: 0,
            checkedTitles: 0,
            retriedCalls: 0
        }
    }
    async start() {
        this.startTime = Date.now();
        const foundPath = await this.scan(0, [{ found: false, links: [this.startTitle], path: [] }])
        if (foundPath) {
            console.log(foundPath.path)
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

        const pool = new Pool(40);

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
                        }
                    })
                }
                queue();
            }
        }

        //if we've found a link, just return that
        const scans: LinkScanResult[] = await pool.done(),
            found = scans.find(result => result.found);

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
        const found = links.some((link: string) => {
            const pathToThis = [...pageChain, title, link],
                prettyPathToThis = pathToThis.join(' → ');

            logInfrequently(prettyPathToThis)

            if (this.checkTitle(link)) {
                console.table({
                    from: this.startTitle,
                    to: this.endTitle,
                    jumps: pathToThis.length,
                    path: prettyPathToThis,
                    time: (Date.now() - this.startTime) / 1000 + 's elapsed',
                    ...this.stats
                })
                return true;
            }
        });
        
        return {
            found,
            links,
            path: [...pageChain, title]
        };
    }
}

export const scan = async (startTitle: string, endTitle: string) => {
    return await new WikipediaScanner(startTitle, endTitle).start();
};