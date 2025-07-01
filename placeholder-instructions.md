// Instructions for using the street art image as placeholder

1. Save the street art image you provided as:
   /public/images/street-art-placeholder.jpg

2. Then update the ArtworkPopup.jsx to use the image:

Replace the current placeholder section with:

<div className="artwork-image-placeholder">
  <img 
    src="/images/street-art-placeholder.jpg" 
    alt="Street Art"
    className="placeholder-image"
  />
</div>

3. Update the CSS to use the image properly:

.artwork-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
