const puppeteer = require('puppeteer');
const { promisify } = require('util')
/**
 * @function itemQueryConstructor takes in an item id as a string and returns a URL to the page associated with it
 * @param {string} item_id 
 */
const itemQueryConstructor = (item_id) => {
    let itemURL = "https://www.mercari.com/us/item/"
    itemURL += item_id;
    return itemURL;
}
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
    /**
     * Constructs an instance of the Mercari Scraper class. Doesn't do anything right now, but could be used to initialize puppet options
     */
    constructor() {
        this.active = "active";
    }

    /**
     * Initializes the puppeteer instance and opens up a new tab.
     */
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

    getItemInfo = async (item_id) => {
        let itemURL = itemQueryConstructor(item_id);
        console.log("The generated item URL is: " + itemURL);
        await this.page.goto(itemURL);
        await this.page.waitForTimeout(2000);

        let detailedItemInfo = await this.scrapeItemPage();
        detailedItemInfo.price = parseInt(detailedItemInfo.price.replace('$', ''));
        return detailedItemInfo;

    }
    /**
     * @function parseDOM parses the search page document into an array of items. Note, this only works with the search results page.
     * @param {int} max_results the maximum amount of results to be returned inside the array.
     * @returns 
     */
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
    /**
     * @function scrapeItemPage scrapes an item page and returns all the relevant info from that page
     * @returns an object that contains the following keys
     * @key name: string - name of the listing
     * @key price: integer - price in USD of the item
     * @key categories: string array - string array of categories listing is relate to
     * @key posted: string - date of listing post in month/day/year
     * @key description: string - string (or a bunch of strings in an array or something?) description of itme
     * @key condition: string - description of item condition
     * @key shippingInfo: string - weird shipping info string
     */
    scrapeItemPage = async () => {
        return await this.page.evaluate(() => {
            let itemInfoBlock = document.querySelectorAll('[data-testid="ItemInfo"]')[0]; //Gets the main header block, containing name, brand(?) and price
            let itemCondition = document.querySelectorAll('[data-testid="ItemDetailsCondition"]')[0].innerHTML; //returns condition string
            let preSerializableCategories = document.querySelectorAll('[data-testid="ItemDetailsCategory"]')[0].children; //returns nodeList of elements, each has inner HTML category
            let itemPosted = document.querySelectorAll('[data-testid="ItemDetailsPosted"]')[0].innerHTML; //returns string date posted
            let itemDescription = document.querySelectorAll('[data-testid="ItemDetailsDescription"]')[0].innerHTML; // returns string description
            let itemShipping = document.querySelectorAll('[data-testid="ItemDetailsShipping"]')[0].getElementsByTagName('span')[0].innerHTML; //returns string with shipping details
            let itemCategories = [];
            for (let i = 0; i < preSerializableCategories.length; i++)
            {
                console.log(preSerializableCategories[i]);
                itemCategories.push(preSerializableCategories[i].innerHTML);
            }
            let itemInfo = {
                name: itemInfoBlock.querySelectorAll('[data-testid="ItemName"]')[0].innerHTML, //String
                price: itemInfoBlock.querySelectorAll('[data-testid="ItemPrice"]')[0].innerHTML, //String
                categories : itemCategories,
                posted: itemPosted,
                description: itemDescription,
                condition: itemCondition,
                shippingInfo: itemShipping,
                
            }
            return itemInfo;
        })
    }

}


/**
 * @function program is a sample program using the Mercari api
 */
const program = async () => {
    //Launch a new instance of Puppeteer with the active page as Mercari
    const mercari = new Mercari();
    await mercari.launchMercari();
    // Await a search for "Lenovo Legion", with the max price as 1000, a min price of 0, and browse by newest first. defaults to the first 30 results.
    const itemInfo = await mercari.getItemInfo("m35827742618");
      
}
program();