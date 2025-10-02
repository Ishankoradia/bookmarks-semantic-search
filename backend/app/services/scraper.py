import httpx
from bs4 import BeautifulSoup
import html2text
from urllib.parse import urlparse
from typing import Dict, Any, Optional
import re

class WebScraper:
    def __init__(self):
        self.h2t = html2text.HTML2Text()
        self.h2t.ignore_links = False
        self.h2t.ignore_images = True
        self.h2t.skip_internal_links = True
        self.h2t.body_width = 0
        
    async def scrape_url(self, url: str) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                
                raw_html = response.text
                soup = BeautifulSoup(raw_html, 'lxml')
                
                title = self._extract_title(soup)
                description = self._extract_description(soup)
                content = self._extract_content(soup)
                domain = urlparse(url).netloc
                
                cleaned_content = self._clean_content(content)
                
                return {
                    'title': title or domain,
                    'description': description,
                    'content': cleaned_content,
                    'raw_html': raw_html,
                    'domain': domain,
                    'metadata': {
                        'status_code': response.status_code,
                        'content_type': response.headers.get('content-type', ''),
                        'word_count': len(cleaned_content.split()) if cleaned_content else 0
                    }
                }
                
        except httpx.RequestError as e:
            raise Exception(f"Failed to fetch URL: {str(e)}")
        except Exception as e:
            raise Exception(f"Error scraping URL: {str(e)}")
    
    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        title_tag = soup.find('title')
        if title_tag:
            return title_tag.get_text().strip()
        
        og_title = soup.find('meta', property='og:title')
        if og_title:
            return og_title.get('content', '').strip()
        
        h1_tag = soup.find('h1')
        if h1_tag:
            return h1_tag.get_text().strip()
        
        return None
    
    def _extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        meta_description = soup.find('meta', attrs={'name': 'description'})
        if meta_description:
            return meta_description.get('content', '').strip()
        
        og_description = soup.find('meta', property='og:description')
        if og_description:
            return og_description.get('content', '').strip()
        
        first_p = soup.find('p')
        if first_p:
            text = first_p.get_text().strip()
            return text[:300] if len(text) > 300 else text
        
        return None
    
    def _extract_content(self, soup: BeautifulSoup) -> str:
        for script in soup(['script', 'style', 'nav', 'header', 'footer']):
            script.decompose()
        
        main_content = soup.find('main') or soup.find('article') or soup.find('body')
        
        if main_content:
            text = self.h2t.handle(str(main_content))
            return text
        
        return self.h2t.handle(str(soup))
    
    def _clean_content(self, content: str) -> str:
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r'[ \t]+', ' ', content)
        content = re.sub(r'^\s+|\s+$', '', content, flags=re.MULTILINE)
        
        max_length = 50000
        if len(content) > max_length:
            content = content[:max_length] + "..."
        
        return content