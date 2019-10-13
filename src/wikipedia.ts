import * as req from './req';
import url from 'url';

export const getApiUrl = (query:any) => {
    return url.format({
        protocol: 'https',
        hostname: 'en.wikipedia.org',
        pathname: '/w/api.php',
        query: {...query, format: 'json'}
    })
}

export const getLinkedTitles = async (pageTitle:string) : Promise<string[]> => {
    const linksResult: any = await req.get(getApiUrl({
        action: 'query',
        prop: 'links',
        titles: pageTitle,
        pllimit: 500
    }))

    const pages = linksResult.query.pages
    //only getting one page at a time, just need the first page included
    const pageNumber : string = Object.keys(pages)[0]
    //page doesn't exist
    if (pageNumber === '-1') {
        throw new Error(`There is no page named "${pageTitle}"`)
    }
    return (pages[pageNumber]
        .links || []).map((page: {ns: number, title: string}) => {
            return page.title
        });
}