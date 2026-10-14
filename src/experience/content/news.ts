/**
 * Industry News: a curated directory of publishers. ChefOS links to the
 * original publications; it does not copy, scrape or republish their articles.
 * Descriptions are short, factual summaries written for this directory.
 */
export type Publication = {
  name: string;
  url: string | null; // null = address still to be confirmed by the owner
  region: string;
  focus: string;
  description: string;
  topics: string[];
};

export const PUBLICATIONS: Publication[] = [
  {
    name: "The Caterer",
    url: "https://www.thecaterer.com",
    region: "United Kingdom",
    focus: "Hotels, restaurants, pubs and foodservice",
    description: "Long-running UK hospitality title, first published in 1878 as Caterer and Hotelkeeper. Also runs the Cateys awards.",
    topics: ["Hotels", "Restaurants", "Foodservice", "People"],
  },
  {
    name: "Restaurant Business",
    url: "https://www.restaurantbusinessonline.com",
    region: "United States",
    focus: "Commercial foodservice and restaurant operators",
    description: "Business coverage of independent operators, multi-unit groups and chains: operations, finance and menu trends.",
    topics: ["Operations", "Finance", "Menus", "Chains"],
  },
  {
    name: "Eater",
    url: "https://www.eater.com",
    region: "United States · international",
    focus: "Restaurants, chefs and food culture",
    description: "Restaurant news, openings and long-form reporting on chefs and the industry, with city editions.",
    topics: ["Openings", "Chefs", "Culture"],
  },
  {
    name: "CafeBar Network",
    url: null,
    region: "Serbia · Balkans",
    focus: "HoReCa trade press",
    description: "Trade publication for the HoReCa sector in Serbia and the region. Listed as requested; its web address is still to be confirmed before linking.",
    topics: ["HoReCa", "Regional market"],
  },
];
