import apiUri from "./axios";

const apiRefresh = async (requestFn) => {
    try{
        return await requestFn();
    } catch(err){
        if(err?.response.status === 401 || err.status === 401){
            try{
                await apiUri.post("/auth/refresh");
                return await requestFn();
            } catch {
                throw err
            }
        }
        throw err;
    }
}

export default apiRefresh