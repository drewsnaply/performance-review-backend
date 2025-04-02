/**
 * Handles paginated queries.
 * @param {Model} model - Mongoose model to query.
 * @param {Object} query - Mongoose query object.
 * @param {number} page - Current page number.
 * @param {number} limit - Number of items per page.
 * @returns {Object} Paginated data.
 */
const paginate = async (model, query, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    const data = await model.find(query).skip(skip).limit(limit);
    const total = await model.countDocuments(query);
  
    return {
      data,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    };
  };
  
  module.exports = paginate;