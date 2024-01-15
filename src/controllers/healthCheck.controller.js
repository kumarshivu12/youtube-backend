import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

export const healthCheck = async (req, res) => {
  try {
    //sending response
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "health checked successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "something went wrong while checking health"
    );
  }
};
