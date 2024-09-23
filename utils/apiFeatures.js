class ApiFeatures {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }

  filter() {
    const queryStringObj = { ...this.queryString };
    const excludesFields = ["page", "limit", "sort", "fields", "keyword"];
    excludesFields.forEach((field) => delete queryStringObj[field]);

    // Apply filtration using [gte, gt, lte, lt]
    let queryStr = JSON.stringify(queryStringObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      // Default sorting by creation order (if _id represents creation order)
      this.mongooseQuery = this.mongooseQuery.sort("_id");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.select(fields);
    } else {
      this.mongooseQuery = this.mongooseQuery.select("-__v");
    }
    return this;
  }

  search(modelName) {
    if (this.queryString.keyword) {
      let query = {};
      if (modelName === "NurseModel") {
        query.$or = [
          { name: { $regex: this.queryString.keyword, $options: "i" } },
        ];
      } else {
        query = { name: { $regex: this.queryString.keyword, $options: "i" } };
      }

      this.mongooseQuery = this.mongooseQuery.find(query);
    }
    return this;
  }

  paginate(countDocuments) {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 30;
    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    // Pagination result
    const pagination = {};
    pagination.currentPage = page;
    pagination.limit = limit;
    pagination.numberOfPages = Math.ceil(countDocuments / limit);

    // next page
    if (endIndex < countDocuments) {
      pagination.next = page + 1;
    }
    if (skip > 0) {
      pagination.prev = page - 1;
    }
    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    this.paginationResult = pagination;
    return this;
  }

  populate(modelName) {
    if (modelName === "CityModel") {
      this.mongooseQuery = this.mongooseQuery.populate({
        path: "governorate",
        select: "name -_id",
      });
    } else if (modelName === "NurseModel") {
      this.mongooseQuery = this.mongooseQuery
        .populate({ path: "city", select: "name -_id" })
        .populate({ path: "governorate", select: "name -_id" });
    } else if (modelName === "UserModel") {
      this.mongooseQuery = this.mongooseQuery
        .populate({ path: "city", select: "name -_id" })
        .populate({ path: "governorate", select: "name -_id" });
    } else if (modelName === "ReviewModel") {
      this.mongooseQuery = this.mongooseQuery
        .populate({
          path: "user",
          select: "name -_id",
        })
        .populate({
          path: "nurse",
          select: "name -_id",
        });
    } else if (modelName === "AppointmentModel") {
      this.mongooseQuery = this.mongooseQuery
        .populate({ path: "nurse", select: "name -_id" })
        .populate({ path: "user", select: "name -_id" });
    } else if (modelName === "ReportModel") {
      this.mongooseQuery = this.mongooseQuery
        .populate({
          path: "user",
          select: "name -_id",
        })
        .populate({
          path: "nurse",
          select: "name -_id",
        });
    }
    return this;
  }
}

module.exports = ApiFeatures;
