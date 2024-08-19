const path = require('path');
const fs = require('fs');

const collectionController = {};


collectionController.getAllCollections = async (req, res) => {
  try {
    const collectionPath = path.join(__dirname, "../public/image");
    
    
    if (!fs.existsSync(collectionPath)) {
      throw new Error("Collection directory does not exist");
    }

    const collectionImages = [];

    for (let i = 1; i <= 28; i++) {
      let imageName = `Collection${String(i).padStart(2, '0')}.png`;
      const filePath = path.join(collectionPath, imageName);

      
      if (fs.existsSync(filePath)) {
        collectionImages.push(`/image/${imageName}`);
      }
    }

    res.status(200).json({ status: "success", images: collectionImages });
  } catch (error) {
    res.status(400).json({ status: "fail", error: error.message });
  }
};

module.exports = collectionController;
