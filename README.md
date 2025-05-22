# Reddit Post Scraper

A Playwright-based test suite for scraping posts from Reddit subreddits. This project demonstrates automated web scraping with proper test structure and validation.

## Features

- Scrapes posts from specified subreddit
- Efficient scrolling strategy for loading posts
- Validates post data structure
- Extracts post titles and comments
- Structured test reporting

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd reddit
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

## Usage

Run the test suite:
```bash
npx playwright test
```

View the test report:
```bash
npx playwright show-report
```

## Project Structure

- `specs/reddit.spec.js` - Main test file containing the scraping logic
- `playwright.config.js` - Playwright configuration
- `package.json` - Project dependencies and scripts

## Test Flow

1. Navigates to specified subreddit
2. Loads initial posts
3. Scrolls to load required number of posts
4. Extracts post data (title and comments)
5. Validates results

## Configuration

You can modify the following in `specs/reddit.spec.js`:
- `SUBREDDIT` - Target subreddit to scrape
- `POST_RANGE` - Range of posts to scrape (start and end indices)

## Notes

- The test uses a two-step scrolling strategy for efficient post loading
- Includes proper error handling and validation
- Generates detailed test reports 