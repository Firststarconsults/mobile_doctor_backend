import mongoose from "mongoose";

// Pagination middleware
export const paginate = (model, options = {}) => {
  return async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const sort = req.query.sort || "-createdAt";
      
      // Validate page and limit
      if (page < 1) {
        return res.status(400).json({
          message: "Page number must be greater than 0",
        });
      }
      
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          message: "Limit must be between 1 and 100",
        });
      }

      // Build query
      const query = { ...req.query };
      
      // Remove pagination and sorting parameters from query
      delete query.page;
      delete query.limit;
      delete query.sort;

      // Execute paginated query
      const result = await model.paginate(query, {
        page,
        limit,
        sort,
        populate: options.populate || [],
        select: options.select || "",
        lean: options.lean || true,
      });

      // Add pagination metadata to response
      req.paginatedResult = {
        data: result.docs,
        pagination: {
          currentPage: result.page,
          totalPages: result.totalPages,
          totalDocs: result.totalDocs,
          limit: result.limit,
          hasNextPage: result.hasNextPage,
          hasPrevPage: result.hasPrevPage,
          nextPage: result.hasNextPage ? result.nextPage : null,
          prevPage: result.hasPrevPage ? result.prevPage : null,
        },
      };

      next();
    } catch (error) {
      console.error("Pagination error:", error);
      res.status(500).json({
        message: "Error during pagination",
        error: error.message,
      });
    }
  };
};

// Helper function to create pagination response
export const createPaginatedResponse = (paginatedResult, message = "Data retrieved successfully") => {
  return {
    message,
    data: paginatedResult.data,
    pagination: paginatedResult.pagination,
  };
};
