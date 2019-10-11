import https from 'https';

export const get = (url: string) => {
    return new Promise((resolve: Function, reject: Function) => {
        https.get(url, (res: any) => {
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
                    resolve(JSON.parse(rawData));
                } catch(e) {
                    console.error(`Error parsing data for ${url}`)
                    reject(e);
                }
            })

        }).on('error', (e: Error) => {
            reject(e);
        })
    })
}