import {z} from 'zod';
import * as React from 'react';
import {FC} from 'react';
import {Auth} from 'firebase/auth';
import {getFirebaseAuth} from '@/lib/auth/firebase/client';
import {Controller, useForm} from 'react-hook-form';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import FormHelperText from '@mui/joy/FormHelperText';
import Alert from '@mui/joy/Alert';
import Button from '@mui/joy/Button';
import {toast} from '@/components/core/toaster';
import {apiFetch} from '@/lib/api/api-fetch';

type RoleFormProps = {
    role: string;
}

const roleFormSchema = z.object({
    role: z.string()
})

type RoleFormValues = z.infer<typeof roleFormSchema>;

export const RoleForm: FC<RoleFormProps> = ({role}) => {

    const [isPending, setIsPending] = React.useState<boolean>(false);
    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

    const {
        control,
        handleSubmit,
        setError,
        formState: {errors},
    } = useForm<RoleFormValues>({
        defaultValues: {
            role
        }
    })

    const onSubmit = React.useCallback(
        async (values: RoleFormValues): Promise<void> => {
            setIsPending(true);
            //
            try {
                const response = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/set-role`, {
                    method: 'POST',
                    body: JSON.stringify({
                        role: values.role,
                    }),
                })

                // if (!response.ok) {
                //     const error = await response.json();
                //     toast.error(error.message);
                //     return;
                // }

                // this will refresh the token
                firebaseAuth?.currentUser?.getIdToken(true)
            } catch (err) {
                console.error(err);
                alert('Error setting role');
                // console.error('magic link sign in error', err);
                // setError('root', {type: 'server', message: (err as { message: string }).message});
                setIsPending(false);
            } finally {
                setIsPending(false);
            }
        },
        []
    );

    return (
        <Box sx={{
            p: 2,
            maxWidth: 400,
        }}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Stack spacing={2}>
                    <Controller
                        control={control}
                        name="role"
                        render={({field}) => (
                            <FormControl error={Boolean(errors.role)}>
                                <FormLabel>Role</FormLabel>
                                <Input {...field}/>
                                {errors.role ?
                                    <FormHelperText>{errors.role.message}</FormHelperText> : null}
                            </FormControl>
                        )}
                    />
                    {errors.root ? <Alert color="danger">{errors.root.message}</Alert> : null}
                    <Button disabled={isPending} type="submit">
                        Update Role
                    </Button>
                </Stack>
            </form>
        </Box>
    )
}
