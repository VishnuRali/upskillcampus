// Fallback data when backend is not running
const RESTAURANTS_DATA = [
  { id:1, name:"Pizza Palace", emoji:"🍕", cuisine:"Pizza, Italian", rating:4.5, reviews:2341, deliveryTime:"25-30 min", deliveryFee:29, minOrder:199, tags:["Bestseller","Top Rated"], isOpen:true,
    menu:[
      {id:101,name:"Margherita Pizza",price:249,desc:"Classic tomato sauce with mozzarella",category:"Pizza",emoji:"🍕",popular:true},
      {id:102,name:"Pepperoni Pizza",price:329,desc:"Loaded with pepperoni slices",category:"Pizza",emoji:"🍕",popular:true},
      {id:103,name:"BBQ Chicken Pizza",price:349,desc:"Smoky BBQ sauce with grilled chicken",category:"Pizza",emoji:"🍕"},
      {id:104,name:"Veggie Delight",price:279,desc:"Fresh veggies on tomato base",category:"Pizza",emoji:"🍕"},
      {id:105,name:"Garlic Bread",price:99,desc:"Toasted garlic bread with butter",category:"Sides",emoji:"🍞"},
      {id:106,name:"Coke",price:60,desc:"Chilled Coca Cola 500ml",category:"Drinks",emoji:"🥤"}
    ]},
  { id:2, name:"Burger Barn", emoji:"🍔", cuisine:"Burger, American", rating:4.3, reviews:1823, deliveryTime:"20-25 min", deliveryFee:19, minOrder:149, tags:["Fast Delivery"], isOpen:true,
    menu:[
      {id:201,name:"Classic Beef Burger",price:199,desc:"Juicy beef patty with fresh veggies",category:"Burgers",emoji:"🍔",popular:true},
      {id:202,name:"Chicken Crispy Burger",price:179,desc:"Crispy fried chicken fillet",category:"Burgers",emoji:"🍔",popular:true},
      {id:203,name:"Double Smash Burger",price:279,desc:"Double smashed patties with cheese",category:"Burgers",emoji:"🍔"},
      {id:205,name:"French Fries",price:89,desc:"Crispy golden fries with ketchup",category:"Sides",emoji:"🍟",popular:true},
      {id:206,name:"Milkshake",price:129,desc:"Creamy chocolate or vanilla shake",category:"Drinks",emoji:"🥛"}
    ]},
  { id:3, name:"Biryani House", emoji:"🍛", cuisine:"Biryani, Mughlai", rating:4.7, reviews:3892, deliveryTime:"35-40 min", deliveryFee:0, minOrder:249, tags:["Free Delivery","Popular"], isOpen:true,
    menu:[
      {id:301,name:"Chicken Dum Biryani",price:279,desc:"Aromatic basmati with tender chicken",category:"Biryani",emoji:"🍛",popular:true},
      {id:302,name:"Mutton Biryani",price:349,desc:"Slow-cooked mutton with saffron rice",category:"Biryani",emoji:"🍛",popular:true},
      {id:303,name:"Veg Biryani",price:199,desc:"Mixed vegetables in spiced basmati",category:"Biryani",emoji:"🍛"},
      {id:305,name:"Raita",price:49,desc:"Cool yogurt with cucumber",category:"Sides",emoji:"🥗"}
    ]},
  { id:4, name:"Noodle House", emoji:"🍜", cuisine:"Chinese, Noodles", rating:4.4, reviews:1456, deliveryTime:"30-35 min", deliveryFee:39, minOrder:199, tags:["Trending"], isOpen:true,
    menu:[
      {id:401,name:"Hakka Noodles",price:169,desc:"Stir-fried noodles with veggies",category:"Noodles",emoji:"🍜",popular:true},
      {id:402,name:"Schezwan Fried Rice",price:179,desc:"Spicy fried rice with Schezwan sauce",category:"Rice",emoji:"🍚",popular:true},
      {id:404,name:"Veg Momos",price:129,desc:"Steamed dumplings with veg filling",category:"Starters",emoji:"🥟",popular:true},
      {id:405,name:"Chicken Momos",price:149,desc:"Juicy chicken steamed dumplings",category:"Starters",emoji:"🥟"}
    ]},
  { id:5, name:"Sushi World", emoji:"🍣", cuisine:"Japanese, Sushi", rating:4.6, reviews:987, deliveryTime:"40-45 min", deliveryFee:49, minOrder:399, tags:["Premium"], isOpen:true,
    menu:[
      {id:501,name:"Salmon Nigiri",price:349,desc:"Fresh salmon on seasoned rice",category:"Nigiri",emoji:"🍣",popular:true},
      {id:502,name:"Dragon Roll",price:449,desc:"Shrimp tempura with avocado",category:"Rolls",emoji:"🍱",popular:true},
      {id:503,name:"California Roll",price:329,desc:"Crab, avocado and cucumber",category:"Rolls",emoji:"🍱"},
      {id:504,name:"Miso Soup",price:99,desc:"Traditional Japanese soup",category:"Soups",emoji:"🍵"}
    ]},
  { id:6, name:"Chicken Express", emoji:"🍗", cuisine:"Chicken, Grills", rating:4.2, reviews:2103, deliveryTime:"25-30 min", deliveryFee:29, minOrder:199, tags:["Spicy 🌶️"], isOpen:true,
    menu:[
      {id:601,name:"Tandoori Chicken",price:299,desc:"Clay oven roasted chicken",category:"Grills",emoji:"🍗",popular:true},
      {id:602,name:"Chicken 65",price:229,desc:"Spicy deep fried chicken",category:"Starters",emoji:"🍗",popular:true},
      {id:604,name:"Chicken Wings",price:249,desc:"Crispy wings with dipping sauce",category:"Starters",emoji:"🍗"},
      {id:605,name:"Rumali Roti",price:29,desc:"Thin soft Indian bread",category:"Breads",emoji:"🫓"}
    ]},
  { id:7, name:"Sweet Treats", emoji:"🧁", cuisine:"Desserts, Bakery", rating:4.8, reviews:1678, deliveryTime:"20-25 min", deliveryFee:19, minOrder:149, tags:["Most Loved ❤️"], isOpen:true,
    menu:[
      {id:701,name:"Chocolate Lava Cake",price:179,desc:"Warm cake with gooey chocolate center",category:"Cakes",emoji:"🎂",popular:true},
      {id:702,name:"Cheesecake Slice",price:149,desc:"New York style creamy cheesecake",category:"Cakes",emoji:"🍰",popular:true},
      {id:703,name:"Gulab Jamun",price:89,desc:"Soft milk solids soaked in syrup",category:"Indian Sweets",emoji:"🍮",popular:true},
      {id:705,name:"Brownie",price:99,desc:"Fudgy chocolate brownie",category:"Bakes",emoji:"🍫"}
    ]},
  { id:8, name:"Dosa Corner", emoji:"🫓", cuisine:"South Indian", rating:4.5, reviews:3241, deliveryTime:"20-25 min", deliveryFee:0, minOrder:99, tags:["Free Delivery","Vegetarian"], isOpen:true,
    menu:[
      {id:801,name:"Masala Dosa",price:89,desc:"Crispy dosa with spiced potato filling",category:"Dosas",emoji:"🫓",popular:true},
      {id:802,name:"Idli Sambhar",price:69,desc:"Soft idlis with lentil curry",category:"Breakfast",emoji:"🍚",popular:true},
      {id:803,name:"Vada",price:59,desc:"Crispy lentil donuts",category:"Snacks",emoji:"🍩"},
      {id:805,name:"Filter Coffee",price:39,desc:"Authentic South Indian coffee",category:"Drinks",emoji:"☕",popular:true}
    ]},
  { id:9, name:"Taco Town", emoji:"🌮", cuisine:"Mexican, Tacos", rating:4.1, reviews:876, deliveryTime:"30-35 min", deliveryFee:39, minOrder:199, tags:["New"], isOpen:true,
    menu:[
      {id:901,name:"Chicken Tacos",price:199,desc:"3 tacos with grilled chicken",category:"Tacos",emoji:"🌮",popular:true},
      {id:902,name:"Beef Burrito",price:249,desc:"Loaded burrito with beef and salsa",category:"Burritos",emoji:"🌯"},
      {id:904,name:"Nachos",price:149,desc:"Tortilla chips with cheese dip",category:"Snacks",emoji:"🧀",popular:true}
    ]},
  { id:10, name:"Shake Shack", emoji:"🥤", cuisine:"Shakes, Juices", rating:4.4, reviews:987, deliveryTime:"15-20 min", deliveryFee:19, minOrder:149, tags:["Fast Delivery"], isOpen:true,
    menu:[
      {id:1001,name:"Mango Shake",price:129,desc:"Fresh mango blended thick",category:"Shakes",emoji:"🥭",popular:true},
      {id:1003,name:"Cold Coffee",price:119,desc:"Chilled coffee with ice cream",category:"Coffee",emoji:"☕",popular:true},
      {id:1004,name:"Fresh Lime Soda",price:69,desc:"Refreshing lime soda",category:"Juices",emoji:"🍋"},
      {id:1005,name:"Watermelon Juice",price:89,desc:"Fresh pressed watermelon",category:"Juices",emoji:"🍉"}
    ]},
  { id:11, name:"Wrap It Up", emoji:"🌯", cuisine:"Wraps, Rolls", rating:4.0, reviews:654, deliveryTime:"20-25 min", deliveryFee:29, minOrder:149, tags:["Healthy"], isOpen:true,
    menu:[
      {id:1101,name:"Chicken Shawarma",price:159,desc:"Middle eastern spiced chicken wrap",category:"Wraps",emoji:"🌯",popular:true},
      {id:1102,name:"Paneer Tikka Roll",price:139,desc:"Spiced paneer in rumali roti",category:"Rolls",emoji:"🫔",popular:true},
      {id:1104,name:"Greek Salad",price:129,desc:"Fresh veggies with feta",category:"Salads",emoji:"🥗"}
    ]},
  { id:12, name:"The Steak House", emoji:"🥩", cuisine:"Continental, Steaks", rating:4.6, reviews:1123, deliveryTime:"45-50 min", deliveryFee:59, minOrder:499, tags:["Premium","Top Rated"], isOpen:false,
    menu:[
      {id:1201,name:"Ribeye Steak",price:799,desc:"Premium cut, medium rare",category:"Steaks",emoji:"🥩",popular:true},
      {id:1202,name:"Filet Mignon",price:999,desc:"Tender beef fillet",category:"Steaks",emoji:"🥩"},
      {id:1204,name:"Caesar Salad",price:249,desc:"Romaine with caesar dressing",category:"Salads",emoji:"🥗"}
    ]}
];