import { useState, useEffect } from "react";

export default function LogParser() {
  const [logs, setLogs] = useState([]);
  const [ipHistogram, setIpHistogram] = useState([]);
  const [hourlyTraffic, setHourlyTraffic] = useState([]);
  const [topIPs, setTopIPs] = useState([]);
  const [topHours, setTopHours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    loadDefaultLog();
  }, []);

  const loadDefaultLog = () => {
    setLoading(true);
    fetch("/apache_combined.log")
      .then((res) => res.text())
      .then((data) => processLogs(data))
      .catch((err) => console.error("Error loading log file", err));
  };

  const processLogs = (data) => {
    const logEntries = data.split("\n").filter((line) => line);
    setLogs(logEntries);
    calculateHistograms(logEntries);
    setLoading(false);
  };

  const calculateHistograms = (logEntries) => {
    const ipCount = {};
    const hourCount = Array(24).fill(0);

    logEntries.forEach((entry) => {
      const match = entry.match(
        /^(\d+\.\d+\.\d+\.\d+).*\[(\d{2})\/\w+\/\d{4}:(\d{2}):\d{2}:\d{2}/
      );
      if (match) {
        const ip = match[1];
        const hour = parseInt(match[3]);
        ipCount[ip] = (ipCount[ip] || 0) + 1;
        hourCount[hour]++;
      }
    });

    setIpHistogram(Object.entries(ipCount).sort((a, b) => b[1] - a[1]));
    setHourlyTraffic(hourCount.map((count, hour) => ({ hour, count })));
    findTopContributors(ipCount, hourCount);
  };

  const findTopContributors = (ipCount, hourCount) => {
    const totalTraffic = Object.values(ipCount).reduce((a, b) => a + b, 0);
    let cumulative = 0;
    const topIPs = Object.entries(ipCount)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, count]) => {
        cumulative += count;
        return cumulative / totalTraffic <= 0.85;
      });
    setTopIPs(topIPs);

    const totalHourlyTraffic = hourCount.reduce((a, b) => a + b, 0);
    cumulative = 0;
    const topHours = hourCount
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .filter(({ count }) => {
        cumulative += count;
        return cumulative / totalHourlyTraffic <= 0.7;
      });
    setTopHours(topHours);
  };

  return (
    <div className="p-5 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Log Parser Dashboard</h1>
      {loading ? (
        <p>Loading logs...</p>
      ) : (
        <>
          <h2 className="text-xl font-semibold mt-5">IP Histogram</h2>
          <table className="table-auto w-full bg-white shadow-md rounded-lg">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2">IP Address</th>
                <th className="px-4 py-2">Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {ipHistogram
                .slice((page - 1) * pageSize, page * pageSize)
                .map(([ip, count]) => (
                  <tr key={ip} className="border-b">
                    <td className="px-4 py-2">{ip}</td>
                    <td className="px-4 py-2">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          <h2 className="text-xl font-semibold mt-5">Hourly Traffic</h2>
          <table className="table-auto w-full bg-white shadow-md rounded-lg">
            <thead>
              <tr className="bg-gray-200">
                <th className="px-4 py-2">Hour</th>
                <th className="px-4 py-2">Visitors</th>
              </tr>
            </thead>
            <tbody>
              {hourlyTraffic.map(({ hour, count }) => (
                <tr key={hour} className="border-b">
                  <td className="px-4 py-2">{hour}:00</td>
                  <td className="px-4 py-2">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="text-xl font-semibold mt-5">
            Top Contributing IPs (85%)
          </h2>
          <ul className="bg-white shadow-md rounded-lg p-4">
            {topIPs
              .slice((page - 1) * pageSize, page * pageSize)
              .map(([ip, count]) => (
                <li key={ip} className="border-b py-2">
                  {ip} - {count}
                </li>
              ))}
          </ul>

          <h2 className="text-xl font-semibold mt-5">
            Top Traffic Hours (70%)
          </h2>
          <ul className="bg-white shadow-md rounded-lg p-4">
            {topHours
              .slice((page - 1) * pageSize, page * pageSize)
              .map(({ hour, count }) => (
                <li key={hour} className="border-b py-2">
                  {hour}:00 - {count} visitors
                </li>
              ))}
          </ul>

          <div className="mt-5 flex justify-between">
            <button
              disabled={page === 1}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <button
              disabled={page * pageSize >= ipHistogram.length}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
