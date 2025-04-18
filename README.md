# Home Cooking Journal

A simple, elegant personal website designed for documenting home-cooked meals. This static website allows users to create, view, edit, and delete recipe entries complete with photos, ratings, and personal notes.

## Features

- **Add New Recipes**: Document your culinary creations with titles, dates, instructions, personal notes, and ratings.
- **Upload Photos**: Take pictures directly from your iPhone (or any mobile device) and add them to your recipes.
- **Search & Sort**: Easily find recipes through the search function or sort them by date or rating.
- **Mobile Friendly**: Responsive design works great on phones, tablets, and desktops.
- **No Backend Required**: All data is stored in your browser using localStorage.
- **GitHub Pages Ready**: Easily host this website for free on GitHub Pages.

## How to Use

### Viewing the Website Locally

1. Download all files to your computer
2. Open the `index.html` file in your web browser
3. You're ready to go!

### Adding a New Recipe

1. Click the "Add New Recipe" button on the homepage
2. Fill in the recipe details:
   - Title of the dish
   - Date it was made
   - Rate it from 1-5 stars
   - Write detailed instructions
   - Add personal notes about how it turned out
   - Tap to add photos (you can add multiple)
3. Click "Save Recipe" when you're done

### Editing or Deleting Recipes

1. Click on a recipe to view its details
2. Use the "Edit" button to make changes
3. Use the "Delete" button to remove the recipe

## Hosting on GitHub Pages

To make your cooking journal accessible online:

1. Create a GitHub account if you don't have one already
2. Create a new repository
3. Upload all the files from this project to your repository
4. Go to repository Settings > Pages
5. Under "Source," select "main" branch and save
6. Your site will be published at `https://yourusername.github.io/repositoryname/`

## Data Storage

All recipes and images are stored locally in your browser using localStorage. This means:

- Your data stays on your device
- No server is required
- You can access your recipes even when offline
- If you clear your browser data, your recipes will be lost

For backup, consider periodically exporting your data (you can copy the JSON data from localStorage in your browser's developer tools).

## Browser Compatibility

This website works best on modern browsers like:
- Chrome
- Firefox
- Safari
- Edge

## Customization

You can customize the look and feel by editing the `css/styles.css` file.

## License

This project is open source and available for personal use.

---

Enjoy documenting your culinary journey! 