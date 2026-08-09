from scraper.sources import (
    amazon,
    ashby,
    atlassian,
    greenhouse,
    lever,
    microsoft,
    smartrecruiters,
    workday,
)

FETCHERS = {
    "greenhouse": greenhouse.fetch,
    "ashby": ashby.fetch,
    "lever": lever.fetch,
    "workday": workday.fetch,
    "amazon": amazon.fetch,
    "smartrecruiters": smartrecruiters.fetch,
    "atlassian": atlassian.fetch,
    "microsoft": microsoft.fetch,
}
