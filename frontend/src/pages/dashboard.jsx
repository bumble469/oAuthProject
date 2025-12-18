import apiUri from "../api/axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiRefresh from "../api/refresh";

const DashboardPage = ({setIsAuth}) => {
  const [data, setData] = useState(null);
  const [newData, setNewData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiRefresh(() => apiUri.get("/protected")).then((res) => {
      setData(res.data);
    }).catch(() => {
      navigate("/");
    });
  }, []);

  const getData = () => {
    apiRefresh(() => apiUri.get("/protected_data_get")).then((res) => {
      setNewData(res.data.data);
    })
  }

  const handleLogout = () => {
    apiRefresh(() => apiUri.post('/logout')).then((res) => {
        setIsAuth(false);
        alert(res.data.message)
        navigate("/");
    })
  };

  return (
    <div className="h-screen flex flex-col items-center p-6">
      <div className="w-full flex justify-between items-center">
        <h1>Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
        <button onClick={getData}>Get Data</button>
      </div>

      {data ? (
        <div className="mt-6">
          <p><b>Message:</b> {data.message}</p>
          <p><b>User ID:</b> {data.user.userId}</p>
          <p>new private data: {newData}</p>
        </div>
      ) : (
        <p className="mt-6">Loading...</p>
      )}
    </div>
  );
};

export default DashboardPage;
