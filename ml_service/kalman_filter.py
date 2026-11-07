"""
Kalman Filter Implementation for Soil Parameter Noise Reduction.
Based on IoT sensor time-series / repeated measurements architecture.
"""

from typing import List, Dict, Any, Union

class ScalarKalmanFilter:
    """
    1D Discrete Kalman Filter for noisy soil sensor measurements.
    
    Model:
      x_k = x_{k-1} + w_k,  w_k ~ N(0, Q)  (Process noise)
      z_k = x_k + v_k,      v_k ~ N(0, R)  (Measurement noise)
    """
    def __init__(self, q: float = 1e-4, r: float = 0.05, initial_estimate: float = 0.0, initial_error: float = 1.0):
        self.q = float(q)                   # Process noise covariance
        self.r = float(r)                   # Measurement noise covariance
        self.x_hat = float(initial_estimate) # Current state estimate
        self.p = float(initial_error)       # Current estimate error covariance
        self.history = []

    def update(self, measurement: float) -> Dict[str, float]:
        z = float(measurement)

        # 1. Prediction step
        # x_hat_prior = x_hat
        p_prior = self.p + self.q

        # 2. Measurement update step
        kalman_gain = p_prior / (p_prior + self.r)
        self.x_hat = self.x_hat + kalman_gain * (z - self.x_hat)
        self.p = (1.0 - kalman_gain) * p_prior

        step_record = {
            "measurement": round(z, 4),
            "estimate": round(self.x_hat, 4),
            "kalman_gain": round(kalman_gain, 4),
            "error_covariance": round(self.p, 6)
        }
        self.history.append(step_record)
        return step_record

    def filter_series(self, measurements: List[float]) -> Dict[str, Any]:
        if not measurements:
            return {"filtered_value": 0.0, "raw_values": [], "steps": []}

        # Initialize with the first reading for rapid convergence
        self.x_hat = float(measurements[0])
        self.p = 1.0
        self.history = []

        for m in measurements:
            self.update(m)

        raw_mean = sum(measurements) / len(measurements)
        raw_variance = sum((m - raw_mean) ** 2 for m in measurements) / len(measurements) if len(measurements) > 1 else 0.0

        filtered_steps = [h["estimate"] for h in self.history]
        filtered_mean = sum(filtered_steps) / len(filtered_steps)
        filtered_variance = sum((s - filtered_mean) ** 2 for s in filtered_steps) / len(filtered_steps) if len(filtered_steps) > 1 else 0.0

        noise_reduction_pct = 0.0
        if raw_variance > 1e-6:
            noise_reduction_pct = max(0.0, min(100.0, (1.0 - (filtered_variance / raw_variance)) * 100.0))

        return {
            "filtered_value": round(self.x_hat, 3),
            "raw_mean": round(raw_mean, 3),
            "raw_values": [round(float(m), 3) for m in measurements],
            "filtered_steps": [round(s, 3) for s in filtered_steps],
            "noise_reduction_pct": round(noise_reduction_pct, 1),
            "history": self.history
        }


def filter_soil_readings(
    readings: List[Dict[str, Union[int, float]]],
    q_params: Dict[str, float] = None,
    r_params: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Applies Kalman filtering across multiple sensor readings (e.g. 5 repetitions)
    for all numerical parameters.
    """
    if not readings:
        return {}

    # Default noise configurations tuned for typical agricultural IoT sensors
    default_q = {
        "Soil_pH": 0.001,
        "Soil_Moisture": 0.01,
        "Nitrogen_Level": 0.05,
        "Phosphorus_Level": 0.05,
        "Potassium_Level": 0.05,
        "Organic_Carbon": 0.001,
        "Electrical_Conductivity": 0.005,
        "Temperature": 0.01,
        "Humidity": 0.02
    }

    default_r = {
        "Soil_pH": 0.1,                     # pH probes have moderate noise (+-0.2)
        "Soil_Moisture": 0.5,               # Moisture capacitive probes have +-2% fluctuation
        "Nitrogen_Level": 1.5,              # NPK optical/electrochemical sensors fluctuate
        "Phosphorus_Level": 1.2,
        "Potassium_Level": 1.5,
        "Organic_Carbon": 0.05,
        "Electrical_Conductivity": 0.08,
        "Temperature": 0.3,
        "Humidity": 1.0
    }

    q_dict = {**default_q, **(q_params or {})}
    r_dict = {**default_r, **(r_params or {})}

    numerical_keys = [
        k for k, v in readings[0].items()
        if isinstance(v, (int, float)) and not isinstance(v, bool)
    ]

    filtered_parameters = {}
    detailed_filters = {}

    for key in numerical_keys:
        series = [float(r.get(key, 0.0)) for r in readings if key in r]
        q_val = q_dict.get(key, 0.005)
        r_val = r_dict.get(key, 0.2)

        kf = ScalarKalmanFilter(q=q_val, r=r_val)
        result = kf.filter_series(series)

        filtered_parameters[key] = result["filtered_value"]
        detailed_filters[key] = result

    return {
        "filtered_parameters": filtered_parameters,
        "details": detailed_filters,
        "reading_count": len(readings)
    }

