from fastapi import *
from mysql.connector import pooling
from fastapi.responses import JSONResponse
import json
from dotenv import load_dotenv
import os

app = FastAPI()
load_dotenv()
db_pool = pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=5,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME")
)

# 讀取JSON檔案
with open("data/taipei-attractions.json", "r", encoding="UTF-8") as file:
    data = json.load(file)

attractions = data["result"]["results"]

# 過濾圖片並整理資料
data_list = []
for attr in attractions:
    urls = attr["file"].split("https")
    valid_url = ["https" + url for url in urls if url.lower().endswith(("jpg", "png"))]

    data_list.append((
        attr["name"],
        attr["CAT"],
		attr["description"],
		attr["address"],
		attr["direction"],
        attr["MRT"],
		attr["latitude"],
		attr["longitude"],
        json.dumps(valid_url)
    ))

# 創建表格 
def create_table():
	with db_pool.get_connection() as conn, conn.cursor() as cursor:
		cursor.execute("""
			CREATE TABLE IF NOT EXISTS attractions (
				id INT AUTO_INCREMENT PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				category VARCHAR(100),
				description TEXT,
				address VARCHAR(255),
				transport TEXT,
				mrt VARCHAR(100),
				lat DECIMAL(10, 6),
				lng DECIMAL(10, 6),
				images JSON
			)
		""")
		conn.commit()

# 寫入資料
def insert_data():
	with db_pool.get_connection() as conn, conn.cursor() as cursor:
    
		cursor.execute("TRUNCATE TABLE attractions")
		cursor.executemany("INSERT INTO attractions (name, category, description, address, transport, mrt, lat, lng, images)"
						"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", data_list)   
		conn.commit()

create_table()
insert_data()

@app.get("/api/attractions")
def get_attractions(page: int = Query(0, ge=0), keyword: str = Query(None)):
	try:
		with db_pool.get_connection() as conn, conn.cursor(dictionary=True) as cursor:

			limit = 12
			offset = page * limit
			next_page = None
			
			if keyword:
				query = """SELECT * FROM attractions WHERE name LIKE %s OR mrt LIKE %s LIMIT %s OFFSET %s"""
				params = (f"%{keyword}%", f"%{keyword}%", limit, offset)
				
				count_query = """SELECT COUNT(*) AS count FROM attractions WHERE name LIKE %s OR mrt LIKE %s"""
				count_params = (f"%{keyword}%", f"%{keyword}%")
				
			else:
				query = """SELECT * FROM attractions LIMIT %s OFFSET %s"""
				params = (limit, offset)

				count_query = """SELECT COUNT(*) AS count FROM attractions"""
				count_params = ()
				
			
			cursor.execute(query, params)
			results = cursor.fetchall()
			for row in results:
				row["lat"] = float(row["lat"])
				row["lng"] = float(row["lng"])

			# 轉圖片為 List
			for item in results:
				item["images"] = json.loads(item["images"])

			# 判斷 next page
			cursor.execute(count_query, count_params)
			total_count = cursor.fetchone()["count"]

			if (offset + limit) < total_count:
				next_page = page + 1

			return JSONResponse(content={"nextPage": next_page, "data": results})
		
	except Exception as e:
		error_message = str(e)
		return JSONResponse(content={"error": True, "message": error_message}, status_code= 500)


@app.get("/api/attraction/{attractionId}")
def get_attraction_id(attractionId: int):
	try:
		with db_pool.get_connection() as conn, conn.cursor(dictionary=True) as cursor:

			cursor.execute("""SELECT * FROM attractions WHERE id = %s""",(attractionId,))
			result = cursor.fetchone()

			if not result:
				raise HTTPException(status_code=404, detail="Attraction not found")
			
			result["lat"] = float(result["lat"])
			result["lng"] = float(result["lng"])
			result["images"] = json.loads(result["images"])

			return JSONResponse(content={"data": result})
		
	except Exception as e:
		error_message = str(e)
		return JSONResponse(content={"error": True, "message": error_message}, status_code = 500)
	
@app.get("/api/mrts")
def get_mrts():
	try:
		with db_pool.get_connection() as conn, conn.cursor(dictionary = True) as cursor:

			cursor.execute("""
				  SELECT mrt, COUNT(*) FROM attractions 
				  WHERE mrt is NOT NULL 
				  GROUP BY mrt 
				  ORDER BY COUNT(*) DESC
			""")
			results = cursor.fetchall()
			mrt_list = [row["mrt"] for row in results]

			return JSONResponse(content={"data": mrt_list})
	
	except Exception as e:
		error_message = str(e)
		return JSONResponse(content={"error": True, "message": error_message}, status_code = 500)


# Static Pages (Never Modify Code in this Block)
# @app.get("/", include_in_schema=False)
# async def index(request: Request):
# 	return FileResponse("./static/index.html", media_type="text/html")
# @app.get("/attraction/{id}", include_in_schema=False)
# async def attraction(request: Request, id: int):
# 	return FileResponse("./static/attraction.html", media_type="text/html")
# @app.get("/booking", include_in_schema=False)
# async def booking(request: Request):
# 	return FileResponse("./static/booking.html", media_type="text/html")
# @app.get("/thankyou", include_in_schema=False)
# async def thankyou(request: Request):
# 	return FileResponse("./static/thankyou.html", media_type="text/html")