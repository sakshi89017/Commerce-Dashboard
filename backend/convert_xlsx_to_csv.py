import pandas as pd

src = "C:/Users/saksh/OneDrive/Documents/Desktop/commerce-dashboard/commerce-dashboard/database/sample_commerce_data.xlsx"
dst = "C:/Users/saksh/OneDrive/Documents/Desktop/commerce-dashboard/commerce-dashboard/database/sample_commerce_data_converted.csv"

print('Reading', src)
df = pd.read_excel(src)
print('Rows,Cols:', df.shape)
df.to_csv(dst, index=False, encoding='utf-8')
print('Written', dst)
