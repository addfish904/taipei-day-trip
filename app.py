from fastapi import *
from mysql.connector import pooling
from fastapi.responses import JSONResponse,FileResponse
import json
from dotenv import load_dotenv
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import ExpiredSignatureError
import bcrypt
from datetime import datetime, timedelta
from pydantic import BaseModel, Field

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
load_dotenv()

# 設定 JWT 參數
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/auth")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://13.237.251.22:5500"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# MySQL 連線池
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

# 創建景點表格 
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

# 寫入景點資料
def insert_data():
	with db_pool.get_connection() as conn, conn.cursor() as cursor:
		sql = """
			INSERT INTO attractions (name, category, description, address, transport, mrt, lat, lng, images)
			VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
			ON DUPLICATE KEY UPDATE 
				category = VALUES(category),
				description = VALUES(description),
				address = VALUES(address),
				transport = VALUES(transport),
				mrt = VALUES(mrt),
				lat = VALUES(lat),
				lng = VALUES(lng),
				images = VALUES(images)
		"""
		cursor.executemany(sql, data_list)
		# cursor.executemany("INSERT INTO attractions (name, category, description, address, transport, mrt, lat, lng, images)"
		# 				"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)", data_list)   
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


# 建立 JWT Token
def create_access_token(data: dict, expires_minutes: int = 30):
	to_encode = data.copy()
	expire = datetime.now() + timedelta(minutes=expires_minutes)
	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
	return encoded_jwt


# 註冊會員
@app.post("/api/user")
async def register_user(request: Request):
	try:
		data = await request.json()
		name = data["name"]
		email = data["email"]
		password = data["password"]

		hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

		with db_pool.get_connection() as conn, conn.cursor(dictionary=True) as cursor:
			cursor.execute("SELECT id FROM members WHERE email = %s", (email,))
			if cursor.fetchone():
				return JSONResponse(status_code=400, content={"error": True, "message": "Email 已被註冊"})
			cursor.execute("INSERT INTO members (name, email, password) VALUES (%s, %s, %s)", (name, email, hashed_password))
			conn.commit()

		return {"ok": True}
	
	except Exception as e:
		return JSONResponse(
			status_code=500,
			content={"error": True, "message": "伺服器發生錯誤，請稍後再試"}
		)

# 取得當前登入的會員資訊
@app.get("/api/user/auth")
def get_user_info(token: str = Depends(oauth2_scheme)):
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		return  {"data": {
			"id": payload["id"],
			"name": payload["name"],
			"email": payload["email"]
		}}
	except jwt.ExpiredSignatureError:
		return {"data": None}
	except jwt.InvalidTokenError:
		return {"data": None}
	except Exception:
		return {"data": None}

# 登入會員
@app.put("/api/user/auth")
async def login(request: Request):
	try:
		data = await request.json()
		email = data["email"]
		password = data["password"]

		with db_pool.get_connection() as conn, conn.cursor(dictionary=True) as cursor:
			cursor.execute("SELECT id, name, password FROM members WHERE email = %s", (email,))
			user = cursor.fetchone()

		if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
			return JSONResponse(status_code=400, content={"error": True, "message": "帳號或密碼錯誤"})

		token = create_access_token({
			"id": str(user["id"]),
			"name": user["name"],
			"email": email
		})
		return {"token": token}
	
	except Exception as e:
		print(f"Login error: {e}")
		return JSONResponse(
			status_code=500,
			content={"error": True, "message": "伺服器發生錯誤，請稍後再試"}
		)


class BookingRequestModel(BaseModel):
	attractionId: int
	date: str
	time: str
	price: int


# 建立新的預定行程
@app.post("/api/booking")
async def create_booking(
	booking: BookingRequestModel,
	token: str = Depends(oauth2_scheme)
):
	try:
		payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
		user_id = payload.get("id")
		if not user_id:
			raise HTTPException(status_code=403, detail="未授權的存取")

		with db_pool.get_connection() as conn, conn.cursor(dictionary=True) as cursor:
			cursor.execute("SELECT id FROM bookings WHERE member_id = %s", (user_id,))
			existing = cursor.fetchone()

			if existing:
				cursor.execute("""
					UPDATE bookings 
					SET attraction_id=%s, date=%s, time=%s, price=%s 
					WHERE member_id=%s
				""", (
					booking.attractionId,
					booking.date,
					booking.time,
					booking.price,
					user_id
				))
			else:
				cursor.execute("""
					INSERT INTO bookings (member_id, attraction_id, date, time, price) 
					VALUES (%s, %s, %s, %s, %s)
				""", (
					user_id,
					booking.attractionId,
					booking.date,
					booking.time,
					booking.price
				))

			conn.commit()
		return {"ok": True}
	
	# except ExpiredSignatureError:
	# 	return JSONResponse(status_code=401, content={"error": True, "message": "Signature has expired"})
	except HTTPException:
		return JSONResponse(status_code=400, content={"error": True, "message": "建立失敗，輸入不正確或其他原因"})
	except Exception:
		return JSONResponse(status_code=500, content={"error": True, "message": "伺服器內部錯誤"})


# 取得尚未確認下單的預定行程
@app.get("/api/booking")
def get_booking(token: str = Depends(oauth2_scheme)):
	payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
	user_id = payload["id"]
	if not user_id:
		raise HTTPException(status_code=403, detail="未授權的存取")
	
	with db_pool.get_connection() as conn, conn.cursor(dictionary=True) as cursor:
		cursor.execute("""
			SELECT 
				b.date, b.time, b.price,
				a.id as attraction_id, a.name, a.address, a.images
			FROM bookings b
			JOIN attractions a ON b.attraction_id = a.id
			WHERE b.member_id = %s
		""", (user_id,))
		booking = cursor.fetchone()

		if not booking:
			return {"data": None}
		
		images = json.loads(booking["images"])

		return {  
			"data": {
				"attraction": {
				"id": booking["attraction_id"],
				"name": booking["name"],
				"address": booking["address"],
				"image": images[0]
				},
				"date": str(booking["date"]),
				"time": booking["time"],
				"price": booking["price"]
			}
		}
		
# 刪除目前的預定行程
@app.delete("/api/booking")
def delete_booking(token: str = Depends(oauth2_scheme)):
	payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
	user_id = payload["id"]

	if not user_id:
		raise HTTPException(status_code=403, detail="未授權的存取")

	with db_pool.get_connection() as conn, conn.cursor(dictionary=True) as cursor:
		cursor.execute("DELETE FROM bookings WHERE member_id = %s",(user_id,))
		conn.commit()

	return {"ok": True}



# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):
	return FileResponse("./static/index.html", media_type="text/html")

@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
	return FileResponse("./static/attraction.html", media_type="text/html")

@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
	return FileResponse("./static/booking.html", media_type="text/html")
# @app.get("/thankyou", include_in_schema=False)
# async def thankyou(request: Request):
# 	return FileResponse("./static/thankyou.html", media_type="text/html")