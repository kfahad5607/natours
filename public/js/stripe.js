import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe('pk_test_51HTSmyL6595S0FZ0JGYLFLyQpWBHLGG5opTMwzK6yyRi4gVWvMP8g0rHqTTYfbaa4WlJOUmHNiRtyOH85ULn9SxJ00rDAFHBWf');
// const stripe = Stripe('pk_test_51HTSmyL6595S0FZ0JGYLFLyQpWBHLGG5opTMwzK6yyRi4gVWvMP8g0rHqTTYfbaa4WlJOUmHNiRtyOH85ULn9SxJ00rDAFHBWf');
export const bookTour = async tourId => {
    try {
        // 1) Get checkout session from API
        const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
        // 2) create checkout form + charge credit card
        await stripe.redirectToCheckout({ sessionId: session.data.session.id });

    } catch (err) {
        showAlert('error', err);
    }

};