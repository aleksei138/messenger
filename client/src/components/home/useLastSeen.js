import { useEffect, useRef, useState } from "react";
import socketIOClient from "socket.io-client";

const LASTSEEN_EVENT = "lastSeen";
const token = localStorage.getItem('authentication');

// =====================================
// ========= Last Seen manager =========
// =====================================
const useLastSeen = (userId) => {
    const [lastSeen, setLastSeen] = useState({});

    // to store data between rerenders
    const socket = useRef(); // WS connection
    const currUserId = useRef(userId)

    useEffect(() => {
        // only first time
        if (!socket.current) {
            socket.current = socketIOClient({
                query: { token, type: 'lastSeen' }
            });

            socket.current.on(LASTSEEN_EVENT, (info) => {
                if (info.userId === currUserId.current)
                    setLastSeen(info);
            });
        }

        // unsubscribe from old
        if (currUserId.current) {
            socket.current.emit(LASTSEEN_EVENT, {
                type: 'unsubscribe',
                userId: currUserId.current
            });
        }

        currUserId.current = userId;

        // subscribe for new 
        if (userId) {
            socket.current.emit(LASTSEEN_EVENT, {
                type: 'subscribe',
                userId
            });
        }
        

    }, [userId]);

    const reportOnline = () => {
        socket.current.emit(LASTSEEN_EVENT, {
            type: 'reportOnline'
        });
    };

    const reportOffline = () => {
        socket.current.emit(LASTSEEN_EVENT, {
            type: 'reportOffline'
        });
    };

    return {lastSeen, setLastSeen, reportOnline, reportOffline};

};

export default useLastSeen;