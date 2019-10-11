
export class Pool {
    private active: number;
    private waiting: Function[];
    donePromise: Promise<unknown>;
    doneResolve: () => void;
    results: any[];

    constructor(private activeMax : number = 100) {
        this.waiting = []
        this.results = []
        this.active = 0;
        this.doneResolve = () => {return []};
        //resolves similarly to Promise.all()
        this.donePromise = new Promise(resolve => {
            this.doneResolve = () => {
                resolve(this.results);
            }
        })
    }
    queue(fn : Function) {
        return new Promise(resolve => {
            const run = () => {
                this.active++;
                resolve();
            }
            this.active < this.activeMax ? run() : this.waiting.push(run);
        })
            .then(() => {
                return fn()
            })
            .then((result: any) => {
                this.results.push(result)

                this.active--;
                if (this.active < this.activeMax) {
                    const nextWaiting = this.waiting.shift();
                    if (nextWaiting) {
                        nextWaiting();
                    }
                }

                if (this.active === 0) {
                    this.doneResolve();
                }
            })
    }
    done() : Promise<any> {
        return this.donePromise
    }
}