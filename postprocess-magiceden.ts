// Helper library written for useful postprocessing tasks with Flat Data
// Has helper functions for manipulating csv, txt, json, excel, zip, and image files
import {
  readJSON,
  writeCSV,
  removeFile,
} from "https://deno.land/x/flat@0.0.13/mod.ts";

type Item = {
  mintAddress: string;
  price: number;
  title: string;
};

type RawData = {
  results: Array<Item>;
};

type ParsedData = {
  floor: string;
  apt: string;
  price: number;
  rank?: string;
  meURL: string;
  towerURL: string;
};

// Step 1: Read the downloaded_filename JSON
const filename = Deno.args[0];
const data: RawData = await readJSON(filename);
const moonrank: Record<string, string> = await readJSON(
  "zzz/thetower-moonrank.json"
);

// Step 2: Filter specific data we want to keep and write to a new JSON file
const enhancedData: Array<ParsedData> = data.results
  .map((item) => {
    const [_, id] = item.title.split("#");
    const [floor, apt] = id.split("-");
    const towerURL = `https://towerdao.com/${floor}/${apt}`;
    const meURL = `https://magiceden.io/item-details/${item.mintAddress}`;

    return {
      floor,
      apt,
      price: item.price,
      rank: moonrank[id],
      towerURL,
      meURL,
    };
  })
  .filter(Boolean);

console.log("Initial items:", data.results.length);
console.log("Processed items:", enhancedData.length);

// Step 3. Write a new JSON file with our filtered data
await writeCSV("data-magiceden.csv", enhancedData);
console.log("Wrote magiceden data");

const sortedData = enhancedData.sort((a, b) => {
  return parseInt(a.rank || "") - parseInt(b.rank || "");
});

const buckets = sortedData.reduce<Array<Array<ParsedData>>>(
  (data, item) => {
    let bucket: number | undefined = undefined;
    if (item.price <= 4) {
      bucket = 0;
    } else if (item.price <= 8) {
      bucket = 1;
    } else if (item.price <= 12) {
      bucket = 2;
    } else if (item.price <= 20) {
      bucket = 3;
    }

    if (bucket !== undefined) {
      data[bucket].push(item);
    }

    return data;
  },
  [[], [], [], []]
);

const topPicks = buckets.reduce((picks, bucket) => {
  const bucketSelection = bucket.slice(0, 3);
  return [...picks, ...bucketSelection];
}, []);

await writeCSV("top-picks-magiceden.csv", topPicks);
console.log("Wrote top picks");

await removeFile(filename);
