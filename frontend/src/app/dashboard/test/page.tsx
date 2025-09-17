import {TestUser} from '@/app/dashboard/test/test-user';
import Box from '@mui/joy/Box';

export default function TestPage() {

    return (
        <Box sx={{ p: "var(--Content-padding)" }}>
            <TestUser />
        </Box>
    );
};
