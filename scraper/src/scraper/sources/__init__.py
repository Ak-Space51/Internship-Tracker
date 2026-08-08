from scraper.sources import amazon, ashby, greenhouse, lever, workday

FETCHERS = {
    "greenhouse": greenhouse.fetch,
    "ashby": ashby.fetch,
    "lever": lever.fetch,
    "workday": workday.fetch,
    "amazon": amazon.fetch,
}
