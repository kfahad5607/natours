db.tours.insertMany([{ name: "The avalanche", price: 800, ratings: 4.2, difficulty: "Medium" }, { name: "The park", price: 1000, ratings: 4.1 }, { name: "The glacier", price: 65300, ratings: 4.4, difficulty: "Easy" }, { name: "The safari", price: 6000, ratings: 4.5, difficulty: "Easy" }]);

db.tours.find({ price: { $gte: 600 }, ratings: { $lt: 4.3 } }, { difficulty: "Easy" })

db.tours.find({$or: [{ price: { $gte: 600 }, ratings: { $lt: 4.3 } }, { difficulty: "Easy" }]})