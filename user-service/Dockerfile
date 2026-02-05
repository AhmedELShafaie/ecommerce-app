FROM python:3.12-slim
WORKDIR /app
COPY user-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY proto/ /proto/
COPY user-service/server.py ./
RUN python -m grpc_tools.protoc -I/proto --python_out=./generated --grpc_python_out=./generated /proto/user.proto
EXPOSE 50053
CMD ["python", "server.py"]
