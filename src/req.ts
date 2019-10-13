import https from 'https';

const REQUEST_TIMEOUT_MS = 3000;

export const get = (url: string) => {
    return new Promise((resolve: Function, _reject: Function) => {
        let timedout = false;
        const timeout = setTimeout(() => {
            timedout = true;
            _reject(new Error(`Timed out on ${url}`));
        }, REQUEST_TIMEOUT_MS);

        const reject = (error: Error) => {
            if (timedout) {
                return;
            }
            clearTimeout(timeout);
            _reject(error);
        }

        https.get(url, {
            timeout: 1000
        },
            (res: any) => {
                let errored = false;
                if (res.statusCode !== 200) {
                    errored = true;
                    reject(res.statusCode);
                }

                let rawData: string = '';
                res.on('data', (chunk: string) => rawData += chunk);
                res.on('end', () => {
                    if (errored) {
                        return;
                    }
                    try {
                        if (!timedout) {
                            resolve(JSON.parse(rawData));
                            clearTimeout(timeout);
                        }
                    } catch (e) {
                        console.error(`Error parsing data for ${url}`)
                        reject(e);
                    }
                })

            }).on('error', (e: Error) => {
                reject(e);
            })
    })
}