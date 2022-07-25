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
        this.active = "active";
    }

    launchMercari = async () => {
        this.puppeteer = puppeteer; 
        await this.launchPage(this.puppeteer);
    }
      /**
     * @function launchPage launches puppeteer on mercari
     * @param {*} puppeteer takes in the object's own puppeteer variable and launches a new page.
     */
    launchPage = async (puppeteer) => {
        this.browser = await puppeteer.launch({headless: false})
        this.page = await this.browser.newPage();
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
        //returns an array of objects containing item information. Possibly use this to build an array of Item objects that can be filtered.
        let searchArray = await this.parseDOM(max_results);
        return searchArray; 
    }
    parseDOM = async (max_results) => {
        let itemList = await this.page.evaluate ((result) => {
            let itemNodeList = document.querySelectorAll('[data-testid="SearchResults"]')[0].children[0].children[0];
            let serializableReturnList = [];
            for (let i = 0; i < itemNodeList.childElementCount; i++)
            {

                let itemFlexContainer = itemNodeList.children[i];

                let link = itemFlexContainer.children[0].getAttribute('href');
                let category = itemFlexContainer.querySelectorAll('[data-testid="StyledProductThumb"]')[0].children[0].content
                let brand = itemFlexContainer.querySelectorAll('[data-testid="StyledProductThumb"]')[0].children[1].content
                let condition =  itemFlexContainer.querySelectorAll('[data-testid="StyledProductThumb"]')[0].children[2].content
                let description =  itemFlexContainer.querySelectorAll('[data-testid="StyledProductThumb"]')[0].children[3].content

                let item = itemFlexContainer.querySelectorAll('[data-testid="ItemName"]')[0].innerHTML;
                let price = itemFlexContainer.querySelectorAll('[data-testid="ItemPrice"]')[0].children[0].innerHTML;
                let itemData = {
                    name: item,
                    price: price,
                    category: category,
                    brand : brand,
                    condition: condition,
                    description: description,
                    link: link,
                }
                serializableReturnList.push(itemData);
            }
            return serializableReturnList;
        })
        return itemList;
    }

}
const program = async () => {
    //Launch a new instance of Puppeteer with the active page as Mercari
    const mercari = new Mercari();
    await mercari.launchMercari();
    // Await a search for "Lenovo Legion", with the max price as 1000, a min price of 0, and browse by newest first. defaults to the first 30 results.
    const results = await mercari.searchFor("item" , 1200, 0, 'newest_first');
      
}
program();