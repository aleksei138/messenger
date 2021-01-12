import React, { useRef, useState } from 'react';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import CssBaseline from '@material-ui/core/CssBaseline';
import TextField from '@material-ui/core/TextField';
import { Alert, AlertTitle } from '@material-ui/lab';
import Link from '@material-ui/core/Link';
import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';



function Copyright() {
  return (
    <Typography variant="body2" color="textSecondary" align="center">
      {'Copyright © '}
      <Link color="inherit">
        Simplex
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const useStyles = makeStyles((theme) => ({
  paper: {
    marginTop: theme.spacing(8),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.secondary.main,
  },
  form: {
    width: '100%', // Fix IE 11 issue.
    marginTop: theme.spacing(3),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
  },
}));

function setCookie(name, value, expiresIn) {
  var date = new Date();
  date.setTime(date.getTime() + expiresIn*1000);
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

export default function SignUp() {
  const classes = useStyles();

  const [alert, setAlert] = useState(false);
  const [alertPassword, setAlertPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState();

  document.title = 'Sign Up';

  const formInfo = useRef({
      firstName: '',
      lastName: '',
      username: '',
      password: '',
      repeatedPassword: ''
  });

  function submit(event) {
    event.preventDefault();

    if (formInfo.current.password !== formInfo.current.repeatedPassword) {
        setAlertPassword(true);
        setTimeout(() => {
            setAlertPassword(false);
        }, 3000);
        return;
    }

    fetch('api/createuser', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
        body:  JSON.stringify(formInfo.current)
    }).then((response) => {
          response.json().then((data) => {
            if (!response.ok) {            
              throw new Error(data.message);
            }
            setCookie('authentication', data.authentication.token, data.authentication.expiresIn);

            localStorage.setItem('authentication', data.authentication.token); // to fetch token easier
            localStorage.setItem('user', JSON.stringify(data.user));
            
            setSuccess(true);

            setTimeout(() => {            
                window.location.href = '/';
            }, 1000);
            
          }).catch((error) => {
            // if that's a custom errot
            let message = error.name === 'Error' ? error.message : 'Something went wrong';
            setErrorMessage(message);
            setAlert(true);
            console.log(error);
            setTimeout(() => {
              setAlert(false);
            }, 8000);
          });
          
        });
    }

  return (
    <Container component="main" maxWidth="xs">
      <CssBaseline />
      <div className={classes.paper}>
        <Avatar className={classes.avatar}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign Up
        </Typography>
        <form className={classes.form} onSubmit={submit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoComplete="fname"
                name="firstName"
                variant="outlined"
                required
                fullWidth
                id="firstName"
                label="First Name"
                autoFocus
                onChange={event => {
                    const { value } = event.target;
                    formInfo.current.firstName = value;
                  }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                variant="outlined"
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                autoComplete="lname"
                onChange={event => {
                    const { value } = event.target;
                    formInfo.current.lastName = value;
                  }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                onChange={event => {
                    const { value } = event.target;
                    formInfo.current.username = value;
                  }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                onChange={event => {
                    const { value } = event.target;
                    formInfo.current.password = value;
                  }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                variant="outlined"
                required
                fullWidth
                name="repeatedPassword"
                label="Repeat Password"
                type="password"
                id="repeatedPassword"
                autoComplete="repeated-password"
                onChange={event => {
                    const { value } = event.target;
                    formInfo.current.repeatedPassword = value;
                  }}
              />
            </Grid>
          </Grid>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            className={classes.submit}
          >
            Sign Up
          </Button>
          { alert &&
              <Alert severity="error">
                <AlertTitle>Error</AlertTitle>
                {errorMessage}
              </Alert>
          }
          { alertPassword &&
              <Alert severity="error">
                <AlertTitle>Error</AlertTitle>
                Passwords do not match
              </Alert>
          }
          { success &&
              <Alert severity="success">
                <AlertTitle>Success</AlertTitle>
                Welcome!
              </Alert>
          }
          <Grid container justify="flex-end" style={{marginTop: '2em'}}>
            <Grid item>
              <Link href="/login" variant="body2">
                Already have an account? Log in
              </Link>
            </Grid>
          </Grid>
        </form>
      </div>
      <Box mt={5}>
        <Copyright />
      </Box>
    </Container>
  );
}