const puppeteer = require('puppeteer');
const { promisify } = require('util')

const searchQueryConstructor = (item, max_price, min_price, sort_by ) => {
    sortByConverter = (str) => {
        if (str === 'best_match')
            return '1';
        else if (str === 'newest_first')
            return '2';
        else if (str === 'lowest_price_first')
            return '3';
        else if (str === 'highest_price_first')
            return '4';
        else if (str === 'number_of_likes')
            return '5';
        else
            return '1';
    }    
    let searchURL = "https://www.mercari.com/search/?"
    searchURL += "keyword=" + encodeURIComponent(item);
    if (max_price > 0)
        searchURL += '&maxPrice=' + (max_price * 100);
    if (min_price > 0)
        searchURL += '&minPrice=' + (min_price * 100);
    searchURL += "&sortBy=" + sortByConverter(sort_by);
    return searchURL;
}
class Mercari {
    constructor() {
        this.puppeteer = puppeteer; 
        this.launchPage(this.puppeteer);
    }
    /**
     * @function launchPage launches puppeteer on mercari
     * @param {*} puppeteer 
     */
    launchPage = async (puppeteer) => {
        this.browser = await puppeteer.launch({headless: false})
        this.page = await this.browser.newPage();
        this.page.goto('https://www.mercari.com/search/');
    }
    /**
     * @function searchFor takes in parameters to conduct a search, returns n number of results from top of page (defaults to 30)
     * @param {string} item your item search term as a string
     * @param {int} max_price maximum price of results (int)
     * @param {int} min_price minimum price of results (int)
     * @param {string} sort_by options: best_match, newest_first, and lowest_price
     */
    searchFor = async (item, max_price = -1, min_price = -1, sort_by = "best_match", max_results = 30 ) => {
        let createURL = searchQueryConstructor(item, max_price, min_price, sort_by)
        console.log(createURL);
        await this.page.goto(createURL);
        //Give like 4 seconds for the page to load completely.
        await this.page.waitForTimeout(4000);
        return "Results";
    }
    parseDOM = async (max_results) => {
        const listingAmount = await this.page.evaluate ((result) => {
            result = document.querySelectorAll('[data-testid="SearchResults"]')[0].children[0].children[0].childElementCount;
            return result;
        })
        console.log(listingAmount);
    }

}
const program = async () => {
    const mercari = new Mercari();
    const sleep = promisify(setTimeout);
    sleep(3000);
    //const results = await mercari.searchFor("Lenovo Legion", 1000, 0, 'newest_first');
}
program();