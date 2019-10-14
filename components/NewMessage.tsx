import { useRef } from "react";
import { getStreams, StreamEntity } from "../services/Streams";

export const NewMessage = ({ stream }: { stream: StreamEntity }) => {
    const text = useRef(null);
    return (
        <form
            onSubmit={async e => {
                e.preventDefault();
                const message = {
                    text: text.current.value
                };
                text.current.value = "";
                await getStreams().createMessage({ stream, message });
            }}
        >
            <input
                ref={text}
                placeholder="new thought"
                style={{
                    width: "100%",
                    padding: "1rem",
                    borderRadius: "none",
                    border: "none",
                    borderTop: "1px solid lightgray"
                }}
            />
        </form>
    );
};
