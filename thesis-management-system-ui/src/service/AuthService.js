import axios from "axios"

const AUTH_REST_API_BASE_URL = "http://localhost:8080/api/auth"

export const loginApi = (username, password) => 
    axios.post(AUTH_REST_API_BASE_URL + "/login", {username, password})