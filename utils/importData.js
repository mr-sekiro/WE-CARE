const fs = require("fs");
const GovernorateModel = require("../models/governorateModel");
const CityModel = require("../models/cityModel");

exports.importData = async () => {
  try {
    // Read and parse governorate data
    const governorateFile = "governorates.json";
    const governorateRawData = fs.readFileSync(governorateFile, "utf8");
    const governorateData = JSON.parse(governorateRawData);

    // Read and parse cities data
    const citiesFile = "cities.json";
    const citiesRawData = fs.readFileSync(citiesFile, "utf8");
    const citiesData = JSON.parse(citiesRawData);

    // Validate the structure of the JSON files
    if (
      !governorateData ||
      !governorateData[2] ||
      !governorateData[2].data ||
      !citiesData ||
      !citiesData[2] ||
      !citiesData[2].data
    ) {
      throw new Error("Invalid JSON format or missing data arrays.");
    }

    // Process governorates
    await Promise.all(
      governorateData[2].data.map(async (governorate) => {
        try {
          // Create governorate document
          const newGovernorate = await GovernorateModel.create({
            name: governorate.governorate_name_en,
            // Add other fields as needed (e.g., id)
          });

          // Find cities belonging to this governorate
          const cities = citiesData[2].data.filter(
            (city) => city.governorate_id === governorate.id
          );

          // Process cities for this governorate
          await Promise.all(
            cities.map(async (city) => {
              try {
                // Create city document
                await CityModel.create({
                  name: city.city_name_en,
                  governorate: newGovernorate._id,
                  // Add other fields as needed (e.g., id)
                });
              } catch (error) {
                if (error.code === 11000) {
                  console.log(`City ${city.city_name_en} already exists.`);
                } else {
                  throw error;
                }
              }
            })
          );

          console.log(`Created governorate: ${newGovernorate.name}`);
        } catch (error) {
          console.error(
            `Error creating governorate ${governorate.governorate_name_en}:`,
            error
          );
        }
      })
    );

    console.log("Data successfully imported!");
    process.exit();
  } catch (error) {
    console.error("Error importing data:", error);
    process.exit(1);
  }
};
