import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        title: {
            type: String, 
            required: [true,"tile is required"]
        },
        description: {
            type: String, 
            required: [true,"description is required"]
        },
        duration: {
            type: Number, 
            required: [true,"duration is required"]
        },
        views: {
            type: Number,
            default: 0
        },
        videoFile: {
            type: String,
            required: [true,"video file is required"]
        },
        thumbnail: {
            type: String,
            required: [true,"thumbnail is required"]
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    }, 
    {
        timestamps: true
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)