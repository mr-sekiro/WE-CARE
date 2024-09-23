const cloudinary = require("./cloudinary");

function extractPublicId(url) {
  const urlParts = url.split("/");
  // Remove the base URL and version part
  const publicIdParts = urlParts.slice(7); // Skip the first 7 parts to remove base URL and version
  const fileName = publicIdParts.pop(); // Get the last part of the URL (file name)
  const publicIdWithoutExtension = fileName.split(".").slice(0, -1).join("."); // Remove the file extension
  return `${publicIdParts.join("/")}/${publicIdWithoutExtension}`; // Join remaining parts to form the public ID
}

exports.deleteImageByUrl = (imageUrl) => {
  const publicId = extractPublicId(imageUrl);
  console.log("Extracted Public ID:", publicId); // Ensure this is correct

  cloudinary.uploader.destroy(publicId, (error, result) => {
    if (error) {
      console.error("Error deleting image:", error);
    } else {
      console.log("Image deleted:", result);
    }
  });
};

