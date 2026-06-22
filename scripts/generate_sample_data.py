#!/usr/bin/env python3
"""Generate realistic e-commerce sample dataset."""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

random.seed(42)
np.random.seed(42)

# --- Reference data ---
CATEGORIES = {
    "Electronics": ["Laptop Pro 15", "Wireless Headphones", "Smartphone X12", "Tablet Ultra",
                    "Smart Watch S3", "Bluetooth Speaker", "USB-C Hub", "Gaming Mouse",
                    "Mechanical Keyboard", "Webcam HD"],
    "Clothing": ["Premium Jeans", "Cotton T-Shirt", "Winter Jacket", "Running Shoes",
                 "Casual Dress", "Sports Hoodie", "Formal Trousers", "Leather Belt",
                 "Woolen Sweater", "Summer Shorts"],
    "Home & Kitchen": ["Air Fryer XL", "Coffee Maker Pro", "Blender 900W", "Knife Set",
                       "Non-Stick Pan", "Rice Cooker", "Toaster Oven", "Vacuum Cleaner",
                       "Water Purifier", "Cookware Set"],
    "Books": ["Data Science Handbook", "Python Mastery", "Business Strategy 2024",
              "The Mindful Leader", "Financial Freedom", "Creative Coding", "AI Revolution",
              "Marketing Playbook", "Design Thinking", "Startup Stories"],
    "Sports": ["Yoga Mat Pro", "Resistance Bands", "Dumbbell Set", "Cycling Helmet",
               "Tennis Racket", "Football Premium", "Swimming Goggles", "Jump Rope",
               "Pull-Up Bar", "Protein Shaker"],
    "Beauty": ["Vitamin C Serum", "Moisturizer SPF50", "Hair Growth Oil", "Face Wash Gel",
               "Lip Balm Set", "Eye Cream", "Foundation Pro", "Perfume Essence",
               "Nail Care Kit", "Sunscreen SPF70"]
}

REGIONS = {
    "North": {
        "Delhi": ["New Delhi", "Noida", "Gurgaon", "Faridabad"],
        "Punjab": ["Amritsar", "Ludhiana", "Chandigarh", "Jalandhar"],
        "Uttar Pradesh": ["Lucknow", "Agra", "Varanasi", "Kanpur"]
    },
    "South": {
        "Karnataka": ["Bangalore", "Mysore", "Hubli", "Mangalore"],
        "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
        "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"]
    },
    "East": {
        "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol"],
        "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur"],
        "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"]
    },
    "West": {
        "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik"],
        "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
        "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota"]
    }
}

PAYMENT_METHODS = ["Credit Card", "Debit Card", "UPI", "Net Banking", "Cash on Delivery", "EMI"]

FIRST_NAMES = ["Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Ananya", "Raj", "Kavya",
               "Arjun", "Divya", "Siddharth", "Pooja", "Amit", "Neha", "Karan",
               "Riya", "Manish", "Shreya", "Deepak", "Meera", "Suresh", "Lakshmi",
               "Rahul", "Sunita", "Ajay", "Geeta", "Vijay", "Nisha", "Anil", "Rekha"]

LAST_NAMES = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Verma", "Mishra", "Joshi",
              "Rao", "Nair", "Reddy", "Agarwal", "Bansal", "Mehta", "Chauhan",
              "Pandey", "Dubey", "Tiwari", "Sinha", "Yadav", "Pillai", "Iyer",
              "Menon", "Shah", "Malhotra", "Kapoor", "Bose", "Das", "Ghosh", "Sen"]

# Product cost margins by category
COST_MARGINS = {
    "Electronics": (0.55, 0.72),
    "Clothing": (0.35, 0.50),
    "Home & Kitchen": (0.42, 0.58),
    "Books": (0.20, 0.35),
    "Sports": (0.38, 0.52),
    "Beauty": (0.30, 0.45)
}

# Price ranges by category
PRICE_RANGES = {
    "Electronics": (2999, 89999),
    "Clothing": (399, 4999),
    "Home & Kitchen": (799, 14999),
    "Books": (199, 999),
    "Sports": (299, 9999),
    "Beauty": (149, 2499)
}


def generate_product_catalog():
    products = []
    pid = 1
    for cat, prods in CATEGORIES.items():
        for prod in prods:
            price_min, price_max = PRICE_RANGES[cat]
            base_price = round(random.uniform(price_min, price_max) / 100) * 100
            products.append({
                "Product_ID": f"P{pid:04d}",
                "Product_Name": prod,
                "Category": cat,
                "Base_Price": base_price
            })
            pid += 1
    return products


def generate_customers(n=500):
    customers = []
    seen = set()
    cid = 1
    while len(customers) < n:
        fname = random.choice(FIRST_NAMES)
        lname = random.choice(LAST_NAMES)
        name = f"{fname} {lname}"
        if name not in seen:
            seen.add(name)
            customers.append({"Customer_ID": f"C{cid:05d}", "Customer_Name": name})
            cid += 1
    return customers


def seasonal_multiplier(date):
    month = date.month
    # Diwali boost Oct-Nov, New Year Jan, Summer May-Jun
    seasonality = {1: 1.3, 2: 0.9, 3: 1.0, 4: 0.95, 5: 1.1, 6: 1.05,
                   7: 0.9, 8: 0.95, 9: 1.0, 10: 1.4, 11: 1.5, 12: 1.2}
    return seasonality.get(month, 1.0)


def generate_orders(n_orders=5000):
    products = generate_product_catalog()
    customers = generate_customers(500)

    # Returning customers – 30% of orders are repeats
    returning_pool = random.sample(customers, 150)

    start_date = datetime(2023, 1, 1)
    end_date = datetime(2024, 12, 31)
    total_days = (end_date - start_date).days

    records = []
    order_ids = set()
    oid = 1

    for _ in range(n_orders):
        # Generate a date with slight growth trend
        day_offset = int(np.random.power(1.5) * total_days)
        order_date = start_date + timedelta(days=day_offset)

        season_mult = seasonal_multiplier(order_date)

        # Order ID
        while True:
            order_id = f"ORD{oid:06d}"
            if order_id not in order_ids:
                order_ids.add(order_id)
                oid += 1
                break

        # Customer
        if random.random() < 0.30:
            customer = random.choice(returning_pool)
        else:
            customer = random.choice(customers)

        # Product
        product = random.choice(products)
        category = product["Category"]

        # Quantity (weighted by category)
        if category in ["Electronics"]:
            qty = random.choices([1, 2, 3], weights=[80, 15, 5])[0]
        elif category in ["Books", "Beauty"]:
            qty = random.choices([1, 2, 3, 4, 5], weights=[40, 30, 15, 10, 5])[0]
        else:
            qty = random.choices([1, 2, 3, 4], weights=[50, 30, 15, 5])[0]

        # Price with small variance and seasonal adjustment
        base_price = product["Base_Price"]
        price_variance = random.uniform(0.95, 1.05)
        unit_price = round(base_price * price_variance, 2)

        revenue = round(unit_price * qty * season_mult, 2)

        cost_lo, cost_hi = COST_MARGINS[category]
        cost_pct = random.uniform(cost_lo, cost_hi)
        cost = round(revenue * cost_pct, 2)
        profit = round(revenue - cost, 2)

        # Region
        region = random.choice(list(REGIONS.keys()))
        state = random.choice(list(REGIONS[region].keys()))
        city = random.choice(REGIONS[region][state])

        payment = random.choice(PAYMENT_METHODS)

        records.append({
            "Order_ID": order_id,
            "Order_Date": order_date.strftime("%Y-%m-%d"),
            "Customer_ID": customer["Customer_ID"],
            "Customer_Name": customer["Customer_Name"],
            "Product_ID": product["Product_ID"],
            "Product_Name": product["Product_Name"],
            "Category": category,
            "Quantity": qty,
            "Price": unit_price,
            "Cost": cost,
            "Revenue": revenue,
            "Profit": profit,
            "Region": region,
            "State": state,
            "City": city,
            "Payment_Method": payment
        })

    # Sort by date
    records.sort(key=lambda x: x["Order_Date"])
    return records


def main():
    print("Generating sample commerce dataset...")
    orders = generate_orders(5000)
    df = pd.DataFrame(orders)

    out_dir = os.path.join(os.path.dirname(__file__), "..", "database")
    os.makedirs(out_dir, exist_ok=True)

    csv_path = os.path.join(out_dir, "sample_commerce_data.csv")
    df.to_csv(csv_path, index=False)

    excel_path = os.path.join(out_dir, "sample_commerce_data.xlsx")
    df.to_excel(excel_path, index=False)

    print(f"✅ Generated {len(df)} orders")
    print(f"   Date range: {df['Order_Date'].min()} → {df['Order_Date'].max()}")
    print(f"   Total Revenue: ₹{df['Revenue'].sum():,.2f}")
    print(f"   Total Profit:  ₹{df['Profit'].sum():,.2f}")
    print(f"   Unique Customers: {df['Customer_ID'].nunique()}")
    print(f"   Categories: {df['Category'].nunique()}")
    print(f"\n📁 Saved to:")
    print(f"   {csv_path}")
    print(f"   {excel_path}")


if __name__ == "__main__":
    main()
