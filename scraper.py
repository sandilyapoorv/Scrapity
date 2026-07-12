from scrapling.fetchers import DynamicFetcher

def scrape_leads(url: str, target_count: int = 10) -> list[dict]:
    """
    Scrapes a target directory URL to extract lead information.
    This is a generic scraper designed to adapt to typical directory structures.
    """
    print(f"Scraping leads from {url}...")
    
    # We use DynamicFetcher to handle client-side rendered sites
    # and bypass common bot protections.
    page = DynamicFetcher.fetch(url)
    
    leads = []
    
    # Heuristic-based scraping: looking for typical elements that represent a "card" or "list item"
    # This is a basic implementation; it might need fine-tuning for specific directories.
    
    # For a generic approach, we look for 'article' tags or divs with classes containing 'card', 'item', 'listing'
    items = page.css('article, .card, .item, .listing, li')
    
    for item in items[:target_count]:
        # Try to find a name/title (usually in a heading or strong tag)
        name_elem = item.css('h2, h3, h4, strong')
        name = name_elem[0].text if name_elem else "Unknown Name"
        
        # Try to find a company (sometimes the name is the company, or it's a separate span)
        # We'll just set it to Name for now if we can't distinguish.
        company = name
        
        # Try to find a website link (a tag starting with http, not pointing back to the directory)
        website = None
        links = item.css('a::attr(href)').getall()
        for link in links:
            if link.startswith('http') and url not in link:
                website = link
                break
        
        # Try to find an email (often 'mailto:' links or text matching email regex)
        email = None
        for link in links:
            if link.startswith('mailto:'):
                email = link.replace('mailto:', '').split('?')[0]
                break
        
        # If no mailto, check text content for @ symbol (basic regex replacement)
        if not email:
            import re
            text_content = item.text
            email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text_content)
            if email_match:
                email = email_match.group(0)

        leads.append({
            "name": name,
            "company": company,
            "website": website or "No website found",
            "email": email
        })
        
    return leads

if __name__ == "__main__":
    # Test the scraper
    print(scrape_leads("https://example.com"))
