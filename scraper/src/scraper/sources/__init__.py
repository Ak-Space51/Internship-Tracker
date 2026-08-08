from scraper.sources import ashby, greenhouse, lever, workday

FETCHERS = {
    "greenhouse": greenhouse.fetch,
    "ashby": ashby.fetch,
    "lever": lever.fetch,
    "workday": workday.fetch,
}
