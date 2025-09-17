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
import {apiFetch} from '@/lib/api/api-fetch';

type PermissionsFormProps = {
    permissions: string[];
}

const permissionsFormSchema = z.object({
    permissions: z.string()
})

type PermissionsFormValues = z.infer<typeof permissionsFormSchema>;

export const PermissionsForm: FC<PermissionsFormProps> = ({permissions}) => {

    const [isPending, setIsPending] = React.useState<boolean>(false);
    const [firebaseAuth] = React.useState<Auth>(getFirebaseAuth());

    const {
        control,
        handleSubmit,
        setError,
        formState: {errors},
    } = useForm<PermissionsFormValues>({
        defaultValues: {
            permissions: permissions.join(' '),
        }
    })

    const onSubmit = React.useCallback(
        async (values: PermissionsFormValues): Promise<void> => {
            setIsPending(true);
            const permissionArray = values.permissions.split(' ').filter((p) => p.length > 0);
            //
            try {
                await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/set-permissions`, {
                    method: 'POST',
                    body: JSON.stringify({
                        permissions: permissionArray,
                    }),
                })

                // this will refresh the token
                firebaseAuth?.currentUser?.getIdToken(true)
            } catch (err) {
                console.error(err);
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
                        name="permissions"
                        render={({field}) => (
                            <FormControl error={Boolean(errors.permissions)}>
                                <FormLabel>Permissions</FormLabel>
                                <Input {...field}/>
                                {errors.permissions ?
                                    <FormHelperText>{errors.permissions.message}</FormHelperText> : null}
                            </FormControl>
                        )}
                    />
                    {errors.root ? <Alert color="danger">{errors.root.message}</Alert> : null}
                    <Button disabled={isPending} type="submit">
                        Update Permissions
                    </Button>
                </Stack>
            </form>
        </Box>
    )
}
