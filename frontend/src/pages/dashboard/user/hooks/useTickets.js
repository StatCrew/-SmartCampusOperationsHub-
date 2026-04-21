import { useEffect, useState } from "react";
import { getMyTickets } from "../../../../api/ticketApi";

export default function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const data = await getMyTickets();
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return { tickets, loading, refetch: fetchTickets };
}