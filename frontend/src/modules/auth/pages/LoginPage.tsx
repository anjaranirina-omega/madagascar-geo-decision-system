import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { CloudRain, Droplets, Eye, EyeOff } from 'lucide-react';
import { ClipboardEvent, useMemo, useState } from 'react';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAppStore } from '../../../app/store';
import { authService } from '../auth.service';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'L’email est obligatoire.')
    .email('Veuillez saisir une adresse email valide.'),
  password: z
    .string()
    .min(1, 'Le mot de passe est obligatoire.')
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères.'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function containsSuspiciousScript(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes('<script') ||
    normalized.includes('</script') ||
    normalized.includes('javascript:') ||
    normalized.includes('onerror=') ||
    normalized.includes('onload=')
  );
}

function getRedirectPathByRole(roleName?: string) {
  switch (roleName) {
    case 'AGENT_TERRAIN':
      return '/interventions';
    case 'ADMIN':
    case 'DECIDEUR':
    case 'ANALYSTE':
    default:
      return '/';
  }
}

function getAuthErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as {
      response?: {
        status?: number;
        data?: {
          message?: string | string[];
        };
      };
    }).response;

    const status = response?.status;
    const message = response?.data?.message;

    const normalizedMessage = Array.isArray(message)
      ? message.join(' ')
      : message ?? '';

    if (status === 401) {
      return 'Identifiants invalides ou compte désactivé.';
    }

    if (status === 403 || normalizedMessage.toLowerCase().includes('désactiv')) {
      return 'Votre compte est désactivé. Veuillez contacter l’administrateur.';
    }

    if (status && status >= 500) {
      return 'Le serveur est momentanément indisponible. Réessayez plus tard.';
    }
  }

  return 'Impossible de se connecter. Vérifiez vos informations puis réessayez.';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAppStore((state) => state.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const defaultValues = useMemo<LoginFormValues>(
    () => ({
      email: 'admin@georisque.mg',
      password: 'admin123',
      rememberMe: true,
    }),
    [],
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues,
    mode: 'onChange',
  });

  const handlePaste = (event: ClipboardEvent<HTMLElement>) => {
    const pastedText = event.clipboardData.getData('text');

    if (containsSuspiciousScript(pastedText)) {
      event.preventDefault();
      setServerError('Contenu collé refusé pour des raisons de sécurité.');
    }
  };

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setServerError('');

    if (
      containsSuspiciousScript(values.email) ||
      containsSuspiciousScript(values.password)
    ) {
      setError('email', {
        type: 'manual',
        message: 'Contenu suspect détecté.',
      });
      return;
    }

    try {
      const result = await authService.login({
        email: values.email.trim(),
        password: values.password,
      });

      setAuth(result.accessToken, result.refreshToken, result.user);

      const redirectPath = getRedirectPathByRole(result.user.role?.name);
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setServerError(getAuthErrorMessage(error));
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: '40% 60%',
        },
        bgcolor: '#ffffff',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          display: {
            xs: 'none',
            md: 'block',
          },
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
          backgroundImage:
            'linear-gradient(180deg, rgba(2, 6, 23, 0.05), rgba(2, 6, 23, 0.76)), url("/images/login-risk-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 20% 12%, rgba(34,197,94,0.12), transparent 32%), radial-gradient(circle at 78% 24%, rgba(14,165,233,0.16), transparent 35%)',
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            left: 48,
            right: 48,
            bottom: 48,
            color: '#ffffff',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #22c55e, #38bdf8)',
                boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
              }}
            >
              <CloudRain size={30} />
              <Droplets size={18} style={{ marginLeft: -8, marginTop: 14 }} />
            </Box>

            <Typography
              sx={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 0.3,
              }}
            >
              RISKCLIM-MG
            </Typography>
          </Box>

          <Typography
            sx={{
              maxWidth: 410,
              fontSize: 16,
              lineHeight: 1.6,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.94)',
              textShadow: '0 2px 12px rgba(0,0,0,0.45)',
            }}
          >
            Système décisionnel spatial pour l’analyse des risques climatiques à
            Madagascar
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          minHeight: {
            xs: '100vh',
            md: 'auto',
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: {
            xs: 3,
            sm: 5,
            md: 8,
          },
          py: 6,
          background: {
            xs:
              'linear-gradient(rgba(255,255,255,0.95), rgba(255,255,255,0.98)), url("/images/login-risk-bg.png")',
            md: '#ffffff',
          },
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            width: '100%',
            maxWidth: 430,
            animation: 'loginFadeIn 420ms ease-out',
            '@keyframes loginFadeIn': {
              from: {
                opacity: 0,
                transform: 'translateY(14px)',
              },
              to: {
                opacity: 1,
                transform: 'translateY(0)',
              },
            },
          }}
        >
          <Typography
            component="h1"
            sx={{
              mb: 5,
              textAlign: 'center',
              fontSize: {
                xs: 28,
                sm: 34,
              },
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: -0.5,
            }}
          >
            Connexion
          </Typography>

          {serverError && (
            <Alert
              severity="error"
              role="alert"
              sx={{
                mb: 3,
                borderRadius: 2,
                '& .MuiAlert-message': {
                  fontWeight: 600,
                },
              }}
            >
              {serverError}
            </Alert>
          )}

          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Box sx={{ mb: 2.5 }}>
                <TextField
                  {...field}
                  id="login-email"
                  label="Email"
                  placeholder="Entrez votre adresse email"
                  type="email"
                  fullWidth
                  autoComplete="email"
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message}
                  onPaste={handlePaste}
                  disabled={isSubmitting}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#ffffff',
                      '&.Mui-focused fieldset': {
                        borderColor: '#16a34a',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#0f7a36',
                    },
                  }}
                />
              </Box>
            )}
          />

          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Box sx={{ mb: 1.5 }}>
                <TextField
                  {...field}
                  id="login-password"
                  label="Mot de passe"
                  placeholder="Entrez votre mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  autoComplete="current-password"
                  error={Boolean(errors.password)}
                  helperText={errors.password?.message}
                  onPaste={handlePaste}
                  disabled={isSubmitting}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword
                                ? 'Masquer le mot de passe'
                                : 'Afficher le mot de passe'
                            }
                            onClick={() => setShowPassword((value) => !value)}
                            onMouseDown={(event) => event.preventDefault()}
                            edge="end"
                            disabled={isSubmitting}
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#ffffff',
                      '&.Mui-focused fieldset': {
                        borderColor: '#16a34a',
                        borderWidth: 2,
                      },
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#0f7a36',
                    },
                  }}
                />
              </Box>
            )}
          />

          <Box
            sx={{
              mb: 3.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: {
                xs: 'wrap',
                sm: 'nowrap',
              },
            }}
          >
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      disabled={isSubmitting}
                      sx={{
                        color: '#16a34a',
                        '&.Mui-checked': {
                          color: '#16a34a',
                        },
                      }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 14, color: '#475569' }}>
                      Se souvenir de moi
                    </Typography>
                  }
                />
              )}
            />

            <Link
              href="#"
              underline="hover"
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color: '#0f7a36',
                outlineColor: '#16a34a',
              }}
            >
              Mot de passe oublié ?
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={!isValid || isSubmitting}
            sx={{
              py: 1.35,
              borderRadius: 2,
              bgcolor: '#16a34a',
              color: '#ffffff',
              fontWeight: 800,
              textTransform: 'none',
              boxShadow: '0 14px 30px rgba(22, 163, 74, 0.25)',
              '&:hover': {
                bgcolor: '#0f7a36',
                boxShadow: '0 16px 34px rgba(15, 122, 54, 0.30)',
              },
              '&.Mui-disabled': {
                bgcolor: '#a7f3d0',
                color: '#ffffff',
              },
              '&:focus-visible': {
                outline: '3px solid rgba(22, 163, 74, 0.35)',
                outlineOffset: 3,
              },
            }}
          >
            {isSubmitting ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} color="inherit" />
                Connexion en cours...
              </Box>
            ) : (
              'Se connecter'
            )}
          </Button>

          <Typography
            sx={{
              mt: 6,
              textAlign: 'center',
              fontSize: 14,
              color: '#64748b',
            }}
          >
            Pas encore de compte ?{' '}
            <Box
              component="span"
              sx={{
                color: '#0f7a36',
                fontWeight: 800,
              }}
            >
              Contactez l’administrateur
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
