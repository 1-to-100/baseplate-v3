import { z } from 'zod';
import * as React from 'react';
import { FC } from 'react';
import { Controller, useForm } from 'react-hook-form';
import Box from '@mui/joy/Box';
import Stack from '@mui/joy/Stack';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import FormHelperText from '@mui/joy/FormHelperText';
import Alert from '@mui/joy/Alert';
import Button from '@mui/joy/Button';

type PermissionsFormProps = {
  permissions: string[];
};

const permissionsFormSchema = z.object({
  permissions: z.string(),
});

type PermissionsFormValues = z.infer<typeof permissionsFormSchema>;

export const PermissionsForm: FC<PermissionsFormProps> = ({ permissions }) => {
  const [isPending, setIsPending] = React.useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PermissionsFormValues>({
    defaultValues: {
      permissions: permissions.join(' '),
    },
  });

  const onSubmit = React.useCallback(async (values: PermissionsFormValues): Promise<void> => {
    setIsPending(true);
    const permissionArray = values.permissions.split(' ').filter((p) => p.length > 0);
    // API call removed
    console.log('Permissions update requested:', permissionArray);
    setIsPending(false);
  }, []);

  return (
    <Box
      sx={{
        p: 2,
        maxWidth: 400,
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={2}>
          <Controller
            control={control}
            name='permissions'
            render={({ field }) => (
              <FormControl error={Boolean(errors.permissions)}>
                <FormLabel>Permissions</FormLabel>
                <Input {...field} />
                {errors.permissions ? (
                  <FormHelperText>{errors.permissions.message}</FormHelperText>
                ) : null}
              </FormControl>
            )}
          />
          {errors.root ? <Alert color='danger'>{errors.root.message}</Alert> : null}
          <Button disabled={isPending} type='submit'>
            Update Permissions
          </Button>
        </Stack>
      </form>
    </Box>
  );
};
