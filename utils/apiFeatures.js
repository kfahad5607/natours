
class APIFeatures {
    // here query is equivalent to mongoose query i.e Tour.find()
    // here queryString is equivalent to request query i.e req.query
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }


    filter() {
//         console/log('hiii',this.queryString)
        const queryObj = { ...this.queryString };
        const excludedFields = ['page', 'limit', 'sort', 'fields'];
        excludedFields.forEach(ele => delete queryObj[ele]);

        // replacing gte,gt,lt,lte to $gte,etc. for advanced filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = JSON.parse(queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`));

        this.query = this.query.find(queryStr);

        return this;
    }

    sort() {
        if (this.queryString.sort) {
            // if there is a tie between first criteria and then we will sort with other criteria passed in the url
            // Multiple criterias are separated by ',' in url
            // But mongoDb requires criteria to be seperated by ' ' so will split criteria by ',' and join them by ' '
            let sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        }
        else {
            // if there is no sorting criteria available in the url, by default it will be sorted by '-createdAt'
            // we have put '-' for newest first
            this.query = this.query.sort('-createdAt');
        }

        return this;
    }

    limitFields() {
        if (this.queryString.fields) {
            let fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        }
        else {
            this.query = this.query.select('-__v');
        }

        return this;
    }

    paginate() {
        // if the user does not request any page then default will be page 1
        const page = this.queryString.page * 1 || 1;
        // if the user does not request any limit then default will be limit 100
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);

        return this;
    }
}

module.exports = APIFeatures;