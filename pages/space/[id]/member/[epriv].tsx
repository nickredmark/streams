import { StreamsProvider } from "../../../../components/StreamsProvider";
import { useRouter } from "next/router";
import { Space } from "../../../../components/Space";
import { goTo } from "../../../../utils/router";


export default () => {
    const router = useRouter();
    return <StreamsProvider>{router.query.id && <Space {...(router.query as any)} goTo={goTo(router, { id: undefined, epriv: undefined })} />}</StreamsProvider>
}