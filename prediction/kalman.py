import numpy as np

class NodeKalmanFilter:
    def __init__(self, dt=1.0):
        # State vector: [lat, lng, v_lat, v_lng]
        self.x = np.zeros((4, 1))
        # State transition matrix
        self.F = np.array([
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ])
        # Measurement matrix (we measure lat, lng)
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0]
        ])
        # Covariance matrix
        self.P = np.eye(4) * 10.0
        # Measurement noise (represents confidence in raw coordinates)
        self.R = np.eye(2) * 0.0001
        # Process noise (represents uncertainty in the constant velocity model)
        self.Q = np.eye(4) * 0.0001
        self.initialized = False

    def predict(self):
        """Predicts the next state. Used when telemetry is fragmented or missing."""
        if not self.initialized:
            return None, None
        self.x = np.dot(self.F, self.x)
        self.P = np.dot(np.dot(self.F, self.P), self.F.T) + self.Q
        return self.x[0, 0], self.x[1, 0]

    def update(self, lat, lng):
        """Updates the state with a new verified measurement."""
        if not self.initialized:
            self.x = np.array([[lat], [lng], [0], [0]])
            self.initialized = True
            return lat, lng
            
        z = np.array([[lat], [lng]])
        y = z - np.dot(self.H, self.x)
        S = np.dot(self.H, np.dot(self.P, self.H.T)) + self.R
        K = np.dot(np.dot(self.P, self.H.T), np.linalg.inv(S))
        self.x = self.x + np.dot(K, y)
        self.P = self.P - np.dot(K, np.dot(self.H, self.P))
        return self.x[0, 0], self.x[1, 0]
