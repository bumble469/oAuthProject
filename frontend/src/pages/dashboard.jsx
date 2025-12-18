import apiUri from "../api/axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DashboardPage = ({setIsAuth}) => {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiUri
      .get("/protected")
      .then((res) => {
        setData(res.data);
      })
      .catch(() => {
        navigate("/");
      });
  }, []);

  const handleLogout = () => {
    apiUri.post('/logout').then((res) => {
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
      </div>

      {data ? (
        <div className="mt-6">
          <p><b>Message:</b> {data.message}</p>
          <p><b>User ID:</b> {data.user.userId}</p>
        </div>
      ) : (
        <p className="mt-6">Loading...</p>
      )}
    </div>
  );
};

export default DashboardPage;
