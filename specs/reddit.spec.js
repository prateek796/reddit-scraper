const { test, expect } = require('@playwright/test');

// Configuration for the Reddit scraper
const SUBREDDIT = 'learnpython'; // Target subreddit to scrape
const POST_RANGE = {
  start: 40,  // Start from 40th post
  end: 45     // End at 45th post (inclusive)
};

/**
 * Validates the scraped results and logs post details
 */
function validateResults(results) {
  // Verify we have exactly 6 results (posts 40-45)
  if (results.length !== 6) {
    throw new Error(`Expected 6 results but got ${results.length}`);
  }
  
  console.log('\nPosts Details (40-45):');
  console.log('----------------');
  
  // Validate and log each result
  results.forEach((result, index) => {
    // Validate required fields
    if (!result.id) {
      throw new Error(`Missing ID for post ${index + 1}`);
    }
    if (!result.title || result.title.trim() === '') {
      throw new Error(`Missing or empty title for post ${index + 1}`);
    }
    
    // Log post details in a structured format
    console.log(`\nPost ${POST_RANGE.start + index}:`);
    console.log(`Title: ${result.title}`);
    console.log(`Comment: ${result.firstComment}`);
    console.log('----------------');
  });
  
  console.log('\n');
  return true;
}

/**
 * Gets the title of the first post on the page
 */
async function getFirstPostTitle(page) {
  const firstPost = await page.$('shreddit-post');
  return await firstPost.$eval('[slot="title"]', el => el.textContent);
}

/**
 * Scrolls up to find the original first post
 * Uses a two-step approach: direct scroll to top, then incremental scrolling if needed
 */
async function scrollUpToFindFirstPost(page, targetFirstPostTitle) {
  // First try to scroll directly to top for efficiency
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  
  await page.waitForTimeout(1000);
  
  const currentFirstPostTitle = await getFirstPostTitle(page);
  if (currentFirstPostTitle === targetFirstPostTitle) {
    return true;
  }
  
  // If not found at top, try incremental scrolling up
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  
  while (attempts < MAX_ATTEMPTS) {
    await page.evaluate(() => {
      window.scrollBy(0, -1500);
    });
    
    await page.waitForTimeout(500);
    
    const currentTitle = await getFirstPostTitle(page);
    if (currentTitle === targetFirstPostTitle) {
      return true;
    }
    
    attempts++;
  }
  
  return false;
}

/**
 * Loads required number of posts using efficient scrolling strategy
 * Uses a two-step approach: scroll to 80% then 95% of page height
 * Falls back to incremental scrolling if needed
 */
async function loadRequiredPosts(page) {
  let currentPostCount = 0;
  const SCROLL_INCREMENT = 1500;  // Pixels to scroll in each increment
  let previousHeight = 0;
  let noNewContentCount = 0;
  
  // Initial wait for first batch of posts to load
  await page.waitForTimeout(3000);
  
  // Get initial page height for two-step scrolling
  const initialHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  
  // Step 1: Scroll to 80% of page height
  const firstStepHeight = Math.floor(initialHeight * 0.8);
  await page.evaluate((height) => {
    window.scrollTo(0, height);
  }, firstStepHeight);
  
  await page.waitForTimeout(2000);  // Wait for content to load
  
  // Step 2: Scroll to near bottom (95% of page height)
  const secondStepHeight = Math.floor(initialHeight * 0.95);
  await page.evaluate((height) => {
    window.scrollTo(0, height);
  }, secondStepHeight);
  
  await page.waitForTimeout(2000);  // Wait for content to load
  
  // Check if we have enough posts after two-step scroll
  currentPostCount = await page.$$eval('shreddit-post', posts => posts.length);
  
  // If we don't have enough posts, use incremental scrolling
  while (currentPostCount < POST_RANGE.end) {
    const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    
    // Check if we've reached the end of the page
    if (currentHeight === previousHeight) {
      noNewContentCount++;
      if (noNewContentCount >= 2) {
        break;  // No more content loading
      }
    } else {
      noNewContentCount = 0;
    }
    
    // Scroll down incrementally
    await page.evaluate((increment) => {
      window.scrollBy(0, increment);
    }, SCROLL_INCREMENT);
    
    await page.waitForTimeout(2000);  // Wait for content to load
    
    currentPostCount = await page.$$eval('shreddit-post', posts => posts.length);
    previousHeight = currentHeight;
    
    if (currentPostCount >= POST_RANGE.end) {
      await page.waitForTimeout(2000);
      break;
    }
  }
  
  return currentPostCount;
}

/**
 * Extracts the content of the first comment on a post
 */
async function getCommentContent(page) {
  try {
    // Wait for comment to be visible
    await page.waitForSelector('shreddit-comment', { timeout: 5000 });
    
    // Extract comment text using specific selector
    const commentContent = await page.$eval('shreddit-comment', el => {
      const commentText = el.querySelector('[slot="comment"]');
      return commentText ? commentText.textContent.trim() : '';
    });
    
    return commentContent || 'No comment available';
  } catch (error) {
    return 'No comment available';
  }
}

// Main test suite
test.describe('Reddit Scraper Tests', () => {
  let initialFirstPostTitle;

  test('should successfully scrape posts from Reddit', async ({ page }) => {
    // Step 1: Navigate to subreddit and wait for initial load
    await test.step('Navigate to subreddit and load initial posts', async () => {
      await page.goto(`https://www.reddit.com/r/${SUBREDDIT}/`);
      await page.waitForSelector('shreddit-post');
    });

    // Step 2: Get initial post information
    await test.step('Get initial post information', async () => {
      initialFirstPostTitle = await getFirstPostTitle(page);
      const initialPostCount = await page.$$eval('shreddit-post', posts => posts.length);
      expect(initialPostCount).toBeGreaterThan(0);
    });

    // Step 3: Load required number of posts
    await test.step('Load required number of posts', async () => {
      const totalPosts = await loadRequiredPosts(page);
      expect(totalPosts).toBeGreaterThanOrEqual(POST_RANGE.end);
    });

    // Step 4: Scroll back to find original first post
    await test.step('Scroll back to find original first post', async () => {
      const scrolltotop = await scrollUpToFindFirstPost(page, initialFirstPostTitle);
      expect(scrolltotop).toBe(true);
    });

    // Step 5: Process and validate posts
    await test.step('Process and validate posts', async () => {
      const allPosts = await page.$$('shreddit-post');
      const targetPostIds = [];
      
      // Collect IDs of target posts
      for (let i = POST_RANGE.start - 1; i < POST_RANGE.end; i++) {
        const postId = await allPosts[i].getAttribute('id');
        targetPostIds.push(postId);
      }

      const results = [];

      // Process each target post
      for (let i = POST_RANGE.start - 1; i < POST_RANGE.end; i++) {
        await allPosts[i].click();
        await page.waitForTimeout(2000);

        const title = await page.$eval('[slot="title"]', el => el.textContent);
        const commentContent = await getCommentContent(page);

        results.push({
          id: targetPostIds[i - (POST_RANGE.start - 1)],
          title,
          firstComment: commentContent
        });

        await page.goBack();
        await page.waitForSelector('shreddit-post');
        await page.waitForTimeout(1000);
      }

      expect(validateResults(results)).toBe(true);
    });
  });
}); 